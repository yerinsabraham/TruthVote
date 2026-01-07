const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

/**
 * Submit a vote for a prediction
 * Validates user hasn't voted, updates vote counts, awards badges
 */
exports.submitVote = onCall(async (request) => {
  const {auth, data} = request;

  // Check authentication
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {predictionId, option, predictionQuestion, predictionCategory} = data;

  // Validate inputs
  if (!predictionId || !option) {
    throw new HttpsError("invalid-argument", "Missing required fields");
  }

  const userId = auth.uid;
  const voteId = `${userId}_${predictionId}`;

  try {
    // Check if user already voted
    const voteRef = db.collection("votes").doc(voteId);
    const voteDoc = await voteRef.get();

    if (voteDoc.exists) {
      throw new HttpsError(
          "already-exists",
          "You have already voted on this prediction",
      );
    }

    // Get prediction to validate it exists and is active
    const predictionRef = db.collection("predictions").doc(predictionId);
    const predictionDoc = await predictionRef.get();

    if (!predictionDoc.exists) {
      throw new HttpsError("not-found", "Prediction not found");
    }

    const predictionData = predictionDoc.data();

    // Check prediction is active
    if (predictionData.status !== "active") {
      throw new HttpsError(
          "failed-precondition",
          "Prediction is not active",
      );
    }

    // Check prediction hasn't ended
    const now = admin.firestore.Timestamp.now();
    if (predictionData.endTime && predictionData.endTime < now) {
      throw new HttpsError(
          "failed-precondition",
          "Prediction voting has ended",
      );
    }

    // Parse option for multi-yes-no format (e.g., "A-yes" or "A-no")
    let actualOption = option;
    let voteType = "regular";

    if (option.includes("-yes")) {
      actualOption = option.replace("-yes", "");
      voteType = "yes";
    } else if (option.includes("-no")) {
      actualOption = option.replace("-no", "");
      voteType = "no";
    }

    // Use batch write for atomicity
    const batch = db.batch();

    // Create vote document
    batch.set(voteRef, {
      predictionId,
      userId,
      option: actualOption, // Store the base option (e.g., 'A', 'B')
      voteType, // Store whether it's yes, no, or regular
      votedAt: now,
      predictionQuestion: predictionQuestion || predictionData.question,
      predictionCategory: predictionCategory || predictionData.category,
      isCorrect: null, // Will be set when prediction resolves
      pointsAwarded: 0,
    });

    // Update prediction vote counts
    if (predictionData.options) {
      const optionIndex = predictionData.options.findIndex(
          (opt) => opt.id === actualOption,
      );
      if (optionIndex !== -1) {
        const updatedOptions = [...predictionData.options];

        // Update the appropriate vote count based on vote type
        if (voteType === "yes") {
          updatedOptions[optionIndex].votesYes =
            (updatedOptions[optionIndex].votesYes || 0) + 1;
        } else if (voteType === "no") {
          updatedOptions[optionIndex].votesNo =
            (updatedOptions[optionIndex].votesNo || 0) + 1;
        } else {
          updatedOptions[optionIndex].votes =
            (updatedOptions[optionIndex].votes || 0) + 1;
        }

        batch.update(predictionRef, {
          options: updatedOptions,
          totalVotes: admin.firestore.FieldValue.increment(1),
        });
      }
    } else {
      // Legacy format
      const updateField = actualOption === "A" ? "voteCountA" : "voteCountB";
      batch.update(predictionRef, {
        [updateField]: admin.firestore.FieldValue.increment(1),
      });
    }

    // Update user stats
    const userRef = db.collection("users").doc(userId);
    batch.update(userRef, {
      totalVotes: admin.firestore.FieldValue.increment(1),
      lastActive: now,
    });

    // Commit batch
    await batch.commit();

    logger.info(`Vote submitted: ${voteId}`);

    return {
      success: true,
      message: "Vote submitted successfully",
    };
  } catch (error) {
    logger.error("Error submitting vote:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Create a new prediction (Admin only)
 */
exports.createPrediction = onCall(async (request) => {
  const {auth, data} = request;

  // Check authentication
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  // Check if user is admin
  const userDoc = await db.collection("users").doc(auth.uid).get();
  if (!userDoc.exists || userDoc.data().role !== "admin") {
    throw new HttpsError(
        "permission-denied",
        "Only admins can create predictions",
    );
  }

  const {
    question,
    description,
    options,
    categoryId,
    subcategory,
    imageUrl,
    sourceLink,
    startTime,
    endTime,
    resolutionTime,
    displayTemplate,
  } = data;

  // Validate inputs
  if (!question || !options || options.length < 2 || !categoryId || !endTime) {
    throw new HttpsError("invalid-argument", "Missing required fields");
  }

  try {
    // Get category name from categoryId
    const categoryDoc = await db.collection("categories").doc(categoryId).get();
    if (!categoryDoc.exists) {
      throw new HttpsError("not-found", "Category not found");
    }
    const category = categoryDoc.data().name;

    const predictionRef = db.collection("predictions").doc();

    // Calculate status based on startTime and endTime
    const now = admin.firestore.Timestamp.now();
    const startTimestamp = startTime ?
      admin.firestore.Timestamp.fromDate(new Date(startTime)) :
      now;
    const endTimestamp = admin.firestore.Timestamp.fromDate(new Date(endTime));
    
    // Determine status: scheduled (before start), active (between start and end), closed (after end)
    let status;
    if (startTimestamp > now) {
      status = "scheduled";
    } else if (endTimestamp <= now) {
      status = "closed";
    } else {
      status = "active";
    }

    const predictionData = {
      question,
      description: description || "",
      options: options.map((opt, index) => ({
        id: String.fromCharCode(65 + index), // 'A', 'B', 'C', etc.
        label: opt.label,
        votes: 0,
      })),
      category,
      categoryId,
      subcategory: subcategory || null,
      imageUrl: imageUrl || null,
      sourceLink: sourceLink || null,
      createdBy: auth.uid,
      creatorName: userDoc.data().displayName || "Admin",
      status: status,
      published: true,
      isApproved: true,
      isFeatured: false,
      displayTemplate: displayTemplate || "two-option-horizontal",
      startTime: startTimestamp,
      endTime: admin.firestore.Timestamp.fromDate(new Date(endTime)),
      resolutionTime: resolutionTime ?
        admin.firestore.Timestamp.fromDate(new Date(resolutionTime)) :
        null,
      resolved: false,
      winningOption: null,
      totalVotes: 0,
      viewCount: 0,
      createdAt: admin.firestore.Timestamp.now(),
    };

    await predictionRef.set(predictionData);

    logger.info(`Prediction created: ${predictionRef.id}`);

    return {
      success: true,
      predictionId: predictionRef.id,
      message: "Prediction created successfully",
    };
  } catch (error) {
    logger.error("Error creating prediction:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Update an existing prediction (Admin only)
 */
exports.updatePrediction = onCall(async (request) => {
  const {auth, data} = request;

  // Check authentication
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  // Check if user is admin
  const userDoc = await db.collection("users").doc(auth.uid).get();
  if (!userDoc.exists || userDoc.data().role !== "admin") {
    throw new HttpsError(
        "permission-denied",
        "Only admins can update predictions",
    );
  }

  const {
    predictionId,
    question,
    description,
    options,
    categoryId,
    subcategory,
    imageUrl,
    sourceLink,
    startTime,
    endTime,
    resolutionTime,
    displayTemplate,
  } = data;

  // Validate inputs
  if (!predictionId || !question || !options || options.length < 2 || 
      !categoryId || !endTime) {
    throw new HttpsError("invalid-argument", "Missing required fields");
  }

  try {
    // Get category name from categoryId
    const categoryDoc = await db.collection("categories").doc(categoryId).get();
    if (!categoryDoc.exists) {
      throw new HttpsError("not-found", "Category not found");
    }
    const category = categoryDoc.data().name;

    const predictionRef = db.collection("predictions").doc(predictionId);
    const predictionDoc = await predictionRef.get();

    if (!predictionDoc.exists) {
      throw new HttpsError("not-found", "Prediction not found");
    }

    const existingData = predictionDoc.data();

    // Build update data, preserving vote counts if options haven't changed
    const updatedOptions = options.map((opt, index) => {
      const existingOption = existingData.options?.find(
          (existing) => existing.label === opt.label,
      );
      return {
        id: String.fromCharCode(65 + index), // 'A', 'B', 'C', etc.
        label: opt.label,
        votes: existingOption ? existingOption.votes : 0,
      };
    });

    // Calculate status based on startTime and endTime
    const now = admin.firestore.Timestamp.now();
    const startTimestamp = startTime ?
      admin.firestore.Timestamp.fromDate(new Date(startTime)) :
      existingData.startTime;
    const endTimestamp = admin.firestore.Timestamp.fromDate(new Date(endTime));
    
    // Determine status: scheduled (before start), active (between start and end), closed (after end)
    let status;
    if (startTimestamp > now) {
      status = "scheduled";
    } else if (endTimestamp <= now) {
      status = "closed";
    } else {
      status = "active";
    }

    const updateData = {
      question,
      description: description || "",
      options: updatedOptions,
      category,
      categoryId,
      subcategory: subcategory || null,
      imageUrl: imageUrl !== undefined ? imageUrl : existingData.imageUrl,
      sourceLink: sourceLink || null,
      displayTemplate: displayTemplate || existingData.displayTemplate || 
        "two-option-horizontal",
      startTime: startTimestamp,
      endTime: admin.firestore.Timestamp.fromDate(new Date(endTime)),
      resolutionTime: resolutionTime ?
        admin.firestore.Timestamp.fromDate(new Date(resolutionTime)) :
        existingData.resolutionTime,
      status: status,
      updatedAt: admin.firestore.Timestamp.now(),
    };

    // Recalculate total votes
    updateData.totalVotes = updatedOptions.reduce((sum, opt) => sum + opt.votes, 0);

    await predictionRef.update(updateData);

    logger.info(`Prediction updated: ${predictionId}`);

    return {
      success: true,
      predictionId: predictionId,
      message: "Prediction updated successfully",
    };
  } catch (error) {
    logger.error("Error updating prediction:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Resolve a prediction and award points (Admin only)
 */
exports.resolvePrediction = onCall(async (request) => {
  const {auth, data} = request;

  // Check authentication
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  // Check if user is admin
  const userDoc = await db.collection("users").doc(auth.uid).get();
  if (!userDoc.exists || userDoc.data().role !== "admin") {
    throw new HttpsError(
        "permission-denied",
        "Only admins can resolve predictions",
    );
  }

  const {predictionId, winningOption} = data;

  if (!predictionId || !winningOption) {
    throw new HttpsError("invalid-argument", "Missing required fields");
  }

  try {
    // Get prediction
    const predictionRef = db.collection("predictions").doc(predictionId);
    const predictionDoc = await predictionRef.get();

    if (!predictionDoc.exists) {
      throw new HttpsError("not-found", "Prediction not found");
    }

    // Update prediction status
    await predictionRef.update({
      status: "resolved",
      resolved: true,
      winningOption,
      resolutionTime: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    });

    // Get all votes for this prediction
    const votesSnapshot = await db
        .collection("votes")
        .where("predictionId", "==", predictionId)
        .get();

    // Award points to correct voters
    const batch = db.batch();
    let correctVoters = 0;

    votesSnapshot.forEach((voteDoc) => {
      const voteData = voteDoc.data();
      const isCorrect = voteData.option === winningOption;
      const pointsAwarded = isCorrect ? 10 : 0; // 10 points for correct vote

      // Update vote
      batch.update(voteDoc.ref, {
        isCorrect,
        pointsAwarded,
      });

      // Update user stats
      if (isCorrect) {
        correctVoters++;
        const userRef = db.collection("users").doc(voteData.userId);
        batch.update(userRef, {
          totalPoints: admin.firestore.FieldValue.increment(pointsAwarded),
          correctVotes: admin.firestore.FieldValue.increment(1),
        });
      }
    });

    await batch.commit();

    logger.info(
        `Prediction resolved: ${predictionId}, ` +
      `correct voters: ${correctVoters}`,
    );

    return {
      success: true,
      message: "Prediction resolved successfully",
      correctVoters,
    };
  } catch (error) {
    logger.error("Error resolving prediction:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Scheduled function to auto-close predictions past their end time
 * Runs every hour
 */
exports.autoClosePredictions = onSchedule("every 60 minutes", async () => {
  try {
    const now = admin.firestore.Timestamp.now();

    // Find active predictions past their end time
    const predictionsSnapshot = await db
        .collection("predictions")
        .where("status", "==", "active")
        .where("endTime", "<", now)
        .get();

    const batch = db.batch();
    let closedCount = 0;

    predictionsSnapshot.forEach((doc) => {
      batch.update(doc.ref, {
        status: "closed",
        updatedAt: now,
      });
      closedCount++;
    });

    if (closedCount > 0) {
      await batch.commit();
      logger.info(`Auto-closed ${closedCount} predictions`);
    }

    return {closedCount};
  } catch (error) {
    logger.error("Error auto-closing predictions:", error);
    throw error;
  }
});

/**
 * Daily Rank Recalculation Job
 * Scheduled at 2 AM UTC daily
 * Processes all users in batches of 100
 */
exports.dailyRankRecalculation = onSchedule({
  schedule: "0 2 * * *", // 2 AM UTC daily
  timeoutSeconds: 540, // 9 minutes
  retryConfig: {
    retryCount: 3,
    maxRetrySeconds: 3600,
  },
}, async (event) => {
  const startTime = Date.now();
  let processedUsers = 0;
  let upgradedUsers = 0;
  let errorCount = 0;

  try {
    logger.info("Starting daily rank recalculation job");

    // Get all users with rank fields
    const usersSnapshot = await db
        .collection("users")
        .where("currentRank", "!=", null)
        .get();

    // Process in batches of 100
    const BATCH_SIZE = 100;
    const users = usersSnapshot.docs;

    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);

      await Promise.allSettled(
          batch.map(async (userDoc) => {
            try {
              const userId = userDoc.id;
              const userData = userDoc.data();

              // Skip if last update was less than 1 hour ago (rate limiting)
              if (userData.lastRankUpdateAt) {
                const lastUpdate = userData.lastRankUpdateAt.toDate ?
                  userData.lastRankUpdateAt.toDate() :
                  new Date(userData.lastRankUpdateAt);
                const hoursSinceUpdate =
                  (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);

                if (hoursSinceUpdate < 1) {
                  return; // Skip this user
                }
              }

              // Recalculate rank using rank service logic
              // Calculate user statistics
              const createdAt = userData.createdAt ?
                (userData.createdAt.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt)) :
                new Date();
              const accountAgeDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

              const currentRankStartDate = userData.currentRankStartDate ?
                (userData.currentRankStartDate.toDate ? userData.currentRankStartDate.toDate() : new Date(userData.currentRankStartDate)) :
                createdAt;
              const daysInCurrentRank = Math.floor((Date.now() - currentRankStartDate.getTime()) / (1000 * 60 * 60 * 24));

              // Calculate accuracy rate
              const totalVotes = userData.totalVotes || 0;
              const correctVotes = userData.correctVotes || 0;
              const accuracyRate = totalVotes > 0 ? (correctVotes / totalVotes) * 100 : 0;

              // Time score (0-100) - 50% weight for Novice/Amateur
              // For Novice, next rank is Amateur which requires 7 days
              // For Amateur, next rank is Analyst which requires 60 days
              const currentRank = userData.currentRank || "Novice";
              const TIME_GATES = {
                "Novice": 7, // To reach Amateur
                "Amateur": 60, // To reach Analyst
                "Analyst": 120, // To reach Professional
                "Professional": 240, // To reach Expert
                "Expert": 365, // To reach Master
                "Master": 0, // Final rank
              };

              const nextGate = TIME_GATES[currentRank] || 0;
              const timeScore = nextGate > 0 ? Math.min(100, (accountAgeDays / nextGate) * 100) : 100;

              // Accuracy score (0-100) - 30% weight
              const MIN_ACCURACY = {
                "Novice": 50,
                "Amateur": 55,
                "Analyst": 60,
                "Professional": 65,
                "Expert": 70,
                "Master": 75,
              };
              const minAcc = MIN_ACCURACY[currentRank] || 50;
              const accuracyScore = accuracyRate >= minAcc ?
                Math.min(100, ((accuracyRate - minAcc) / (100 - minAcc)) * 100) : 0;

              // Consistency score (0-100) - 15% weight for Novice/Amateur
              const weeklyActivity = userData.weeklyActivityCount || 0;
              const MIN_WEEKS = {
                "Novice": 1,
                "Amateur": 2,
                "Analyst": 8,
                "Professional": 16,
                "Expert": 32,
                "Master": 48,
              };
              const minWeeks = MIN_WEEKS[currentRank] || 1;
              const consistencyScore = weeklyActivity >= minWeeks ? 85 : Math.min(85, (weeklyActivity / minWeeks) * 85);

              // Volume score (0-100) - 5% weight for Novice/Amateur
              const totalPredictions = totalVotes;
              const MIN_PREDICTIONS = {
                "Novice": 3,
                "Amateur": 10,
                "Analyst": 30,
                "Professional": 60,
                "Expert": 100,
                "Master": 150,
              };
              const minPreds = MIN_PREDICTIONS[currentRank] || 3;
              const volumeScore = totalPredictions >= minPreds ? 100 : Math.min(100, (totalPredictions / minPreds) * 100);

              // Weights for Novice and Amateur
              const WEIGHTS = {
                "Novice": {time: 0.50, accuracy: 0.30, consistency: 0.15, volume: 0.05},
                "Amateur": {time: 0.50, accuracy: 0.30, consistency: 0.15, volume: 0.05},
                "Analyst": {time: 0.40, accuracy: 0.30, consistency: 0.20, volume: 0.10},
                "Professional": {time: 0.35, accuracy: 0.30, consistency: 0.20, volume: 0.15},
                "Expert": {time: 0.30, accuracy: 0.30, consistency: 0.25, volume: 0.15},
                "Master": {time: 0.25, accuracy: 0.30, consistency: 0.25, volume: 0.20},
              };
              const weights = WEIGHTS[currentRank] || WEIGHTS["Novice"];

              // Calculate final percentage
              const rawPercentage =
                timeScore * weights.time +
                accuracyScore * weights.accuracy +
                consistencyScore * weights.consistency +
                volumeScore * weights.volume;

              const finalPercentage = Math.min(100, Math.max(0, rawPercentage));

              // Update user rank percentage
              await db.collection("users").doc(userId).update({
                rankPercentage: Math.round(finalPercentage * 10) / 10,
                lastRankUpdateAt: admin.firestore.Timestamp.now(),
                // Store breakdown for debugging
                rankBreakdown: {
                  timeScore: Math.round(timeScore),
                  accuracyScore: Math.round(accuracyScore),
                  consistencyScore: Math.round(consistencyScore),
                  volumeScore: Math.round(volumeScore),
                },
              });

              processedUsers++;

              // Trigger rank promotion check for this user
              // (will be handled by separate function)
            } catch (error) {
              logger.error(`Error processing user ${userDoc.id}:`, error);
              errorCount++;
            }
          }),
      );
    }

    const duration = Date.now() - startTime;

    logger.info(
        "Daily rank recalculation complete",
        {
          processedUsers,
          upgradedUsers,
          errorCount,
          durationMs: duration,
        },
    );

    // Precompute leaderboard caches after recalculation
    await precomputeLeaderboards();

    return {
      success: true,
      processedUsers,
      upgradedUsers,
      errorCount,
      durationMs: duration,
    };
  } catch (error) {
    logger.error("Fatal error in daily rank recalculation:", error);
    throw error;
  }
});

/**
 * Precompute Leaderboard Caches
 * Called after daily rank recalculation to update cached leaderboard data
 */
async function precomputeLeaderboards() {
  const startTime = Date.now();
  const ranks = ["Novice", "Amateur", "Analyst", "Professional", "Expert", "Master"];
  const now = admin.firestore.Timestamp.now();
  const CACHE_TTL = 3600000; // 1 hour in milliseconds

  logger.info("Starting leaderboard precomputation");

  try {
    for (const rank of ranks) {
      // Fetch top 100 users for this rank
      const usersSnapshot = await db
          .collection("users")
          .where("currentRank", "==", rank)
          .orderBy("rankPercentage", "desc")
          .limit(100)
          .get();

      const entries = usersSnapshot.docs.map((doc, index) => {
        const data = doc.data();
        return {
          id: doc.id,
          displayName: data.displayName || "Anonymous",
          avatarUrl: data.avatarUrl || null,
          totalPoints: data.totalPoints || 0,
          accuracy: data.accuracy || 0,
          totalVotes: data.totalVotes || 0,
          rank: index + 1,
          currentRank: data.currentRank,
          rankPercentage: data.rankPercentage || 0,
        };
      });

      // Cache top 10
      await db.collection("leaderboards").doc(`${rank}_TOP10`).set({
        rank,
        data: entries.slice(0, 10),
        generatedAt: now,
        expiresAt: new Date(Date.now() + CACHE_TTL),
      });

      // Cache top 100
      await db.collection("leaderboards").doc(`${rank}_TOP100`).set({
        rank,
        data: entries,
        generatedAt: now,
        expiresAt: new Date(Date.now() + CACHE_TTL),
      });

      logger.info(`Precomputed leaderboard for ${rank}: ${entries.length} users`);
    }

    const duration = Date.now() - startTime;
    logger.info(`Leaderboard precomputation complete in ${duration}ms`);

  } catch (error) {
    logger.error("Error precomputing leaderboards:", error);
    // Don't throw - leaderboards will regenerate on demand
  }
}

/**
 * Manual trigger for daily rank recalculation (for testing)
 * Callable function that admins can use to test rank recalculation
 */
exports.manualRankRecalculation = onCall({
  memory: "256MiB",
  timeoutSeconds: 60,
}, async (request) => {
  const {auth, data} = request;

  // Check authentication
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  // Check if user is admin
  const userDoc = await db.collection("users").doc(auth.uid).get();
  if (!userDoc.exists || userDoc.data().role !== "admin") {
    throw new HttpsError(
        "permission-denied",
        "Only admins can manually trigger rank recalculation",
    );
  }

  const {userId, force} = data;

  try {
    logger.info(`Manual rank recalculation triggered for user: ${userId}`);

    const userRef = db.collection("users").doc(userId);
    const userSnapshot = await userRef.get();

    if (!userSnapshot.exists) {
      throw new HttpsError("not-found", "User not found");
    }

    const userData = userSnapshot.data();

    // Force recalculation even if recently updated
    if (!force) {
      if (userData.lastRankUpdateAt) {
        const lastUpdate = userData.lastRankUpdateAt.toDate();
        const hoursSinceUpdate =
          (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);

        if (hoursSinceUpdate < 1) {
          throw new HttpsError(
              "failed-precondition",
              "Rank was updated less than 1 hour ago. Use force=true to override.",
          );
        }
      }
    }

    // Calculate rank percentage using same logic as dailyRankRecalculation
    const createdAt = userData.createdAt ?
      (userData.createdAt.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt)) :
      new Date();
    const accountAgeDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

    const currentRankStartDate = userData.currentRankStartDate ?
      (userData.currentRankStartDate.toDate ? userData.currentRankStartDate.toDate() : new Date(userData.currentRankStartDate)) :
      createdAt;

    // Calculate accuracy rate
    const totalVotes = userData.totalVotes || 0;
    const correctVotes = userData.correctVotes || 0;
    const accuracyRate = totalVotes > 0 ? (correctVotes / totalVotes) * 100 : 0;

    const currentRank = userData.currentRank || "Novice";
    const TIME_GATES = {
      "Novice": 7,
      "Amateur": 60,
      "Analyst": 120,
      "Professional": 240,
      "Expert": 365,
      "Master": 0,
    };

    const nextGate = TIME_GATES[currentRank] || 0;
    const timeScore = nextGate > 0 ? Math.min(100, (accountAgeDays / nextGate) * 100) : 100;

    const MIN_ACCURACY = {
      "Novice": 50,
      "Amateur": 55,
      "Analyst": 60,
      "Professional": 65,
      "Expert": 70,
      "Master": 75,
    };
    const minAcc = MIN_ACCURACY[currentRank] || 50;
    const accuracyScore = accuracyRate >= minAcc ?
      Math.min(100, ((accuracyRate - minAcc) / (100 - minAcc)) * 100) : 0;

    const weeklyActivity = userData.weeklyActivityCount || 0;
    const MIN_WEEKS = {
      "Novice": 1,
      "Amateur": 2,
      "Analyst": 8,
      "Professional": 16,
      "Expert": 32,
      "Master": 48,
    };
    const minWeeks = MIN_WEEKS[currentRank] || 1;
    const consistencyScore = weeklyActivity >= minWeeks ? 85 : Math.min(85, (weeklyActivity / minWeeks) * 85);

    const totalPredictions = totalVotes;
    const MIN_PREDICTIONS = {
      "Novice": 3,
      "Amateur": 10,
      "Analyst": 30,
      "Professional": 60,
      "Expert": 100,
      "Master": 150,
    };
    const minPreds = MIN_PREDICTIONS[currentRank] || 3;
    const volumeScore = totalPredictions >= minPreds ? 100 : Math.min(100, (totalPredictions / minPreds) * 100);

    const WEIGHTS = {
      "Novice": {time: 0.50, accuracy: 0.30, consistency: 0.15, volume: 0.05},
      "Amateur": {time: 0.50, accuracy: 0.30, consistency: 0.15, volume: 0.05},
      "Analyst": {time: 0.40, accuracy: 0.30, consistency: 0.20, volume: 0.10},
      "Professional": {time: 0.35, accuracy: 0.30, consistency: 0.20, volume: 0.15},
      "Expert": {time: 0.30, accuracy: 0.30, consistency: 0.25, volume: 0.15},
      "Master": {time: 0.25, accuracy: 0.30, consistency: 0.25, volume: 0.20},
    };
    const weights = WEIGHTS[currentRank] || WEIGHTS["Novice"];

    const rawPercentage =
      timeScore * weights.time +
      accuracyScore * weights.accuracy +
      consistencyScore * weights.consistency +
      volumeScore * weights.volume;

    const finalPercentage = Math.min(100, Math.max(0, rawPercentage));

    // Update user rank percentage
    await userRef.update({
      rankPercentage: Math.round(finalPercentage * 10) / 10,
      lastRankUpdateAt: admin.firestore.Timestamp.now(),
      rankBreakdown: {
        timeScore: Math.round(timeScore),
        accuracyScore: Math.round(accuracyScore),
        consistencyScore: Math.round(consistencyScore),
        volumeScore: Math.round(volumeScore),
      },
    });

    return {
      success: true,
      message: "Rank recalculation triggered successfully",
      userId,
      rankPercentage: Math.round(finalPercentage * 10) / 10,
      breakdown: {
        timeScore: Math.round(timeScore),
        accuracyScore: Math.round(accuracyScore),
        consistencyScore: Math.round(consistencyScore),
        volumeScore: Math.round(volumeScore),
      },
    };
  } catch (error) {
    logger.error("Error in manual rank recalculation:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Recalculate My Rank
 * Callable function for any user to update their own rank percentage
 * Rate limited to once per hour unless forced
 */
exports.recalculateMyRank = onCall({
  memory: "256MiB",
  timeoutSeconds: 60,
}, async (request) => {
  const {auth, data} = request;

  // Check authentication
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const userId = auth.uid;
  const {force} = data || {};

  try {
    logger.info(`User-initiated rank recalculation for: ${userId}`);

    const userRef = db.collection("users").doc(userId);
    const userSnapshot = await userRef.get();

    if (!userSnapshot.exists) {
      throw new HttpsError("not-found", "User not found");
    }

    const userData = userSnapshot.data();

    // Rate limiting (unless forced by admin)
    if (!force) {
      if (userData.lastRankUpdateAt) {
        const lastUpdate = userData.lastRankUpdateAt.toDate();
        const hoursSinceUpdate =
          (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);

        if (hoursSinceUpdate < 1) {
          return {
            success: false,
            message: "Rank was updated less than 1 hour ago. Please wait.",
            rankPercentage: userData.rankPercentage || 0,
            nextUpdateIn: Math.ceil(60 - (hoursSinceUpdate * 60)), // minutes
          };
        }
      }
    }

    // Calculate rank percentage (same logic as dailyRankRecalculation)
    const createdAt = userData.createdAt ?
      (userData.createdAt.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt)) :
      new Date();
    const accountAgeDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

    const totalVotes = userData.totalVotes || 0;
    const correctVotes = userData.correctVotes || 0;
    const accuracyRate = totalVotes > 0 ? (correctVotes / totalVotes) * 100 : 0;

    const currentRank = userData.currentRank || "Novice";
    const TIME_GATES = {
      "Novice": 7,
      "Amateur": 60,
      "Analyst": 120,
      "Professional": 240,
      "Expert": 365,
      "Master": 0,
    };

    const nextGate = TIME_GATES[currentRank] || 0;
    const timeScore = nextGate > 0 ? Math.min(100, (accountAgeDays / nextGate) * 100) : 100;

    const MIN_ACCURACY = {"Novice": 50, "Amateur": 55, "Analyst": 60, "Professional": 65, "Expert": 70, "Master": 75};
    const minAcc = MIN_ACCURACY[currentRank] || 50;
    const accuracyScore = accuracyRate >= minAcc ?
      Math.min(100, ((accuracyRate - minAcc) / (100 - minAcc)) * 100) : 0;

    const weeklyActivity = userData.weeklyActivityCount || 0;
    const MIN_WEEKS = {"Novice": 1, "Amateur": 2, "Analyst": 8, "Professional": 16, "Expert": 32, "Master": 48};
    const minWeeks = MIN_WEEKS[currentRank] || 1;
    const consistencyScore = weeklyActivity >= minWeeks ? 85 : Math.min(85, (weeklyActivity / minWeeks) * 85);

    const totalPredictions = totalVotes;
    const MIN_PREDICTIONS = {"Novice": 3, "Amateur": 10, "Analyst": 30, "Professional": 60, "Expert": 100, "Master": 150};
    const minPreds = MIN_PREDICTIONS[currentRank] || 3;
    const volumeScore = totalPredictions >= minPreds ? 100 : Math.min(100, (totalPredictions / minPreds) * 100);

    const WEIGHTS = {
      "Novice": {time: 0.50, accuracy: 0.30, consistency: 0.15, volume: 0.05},
      "Amateur": {time: 0.50, accuracy: 0.30, consistency: 0.15, volume: 0.05},
      "Analyst": {time: 0.40, accuracy: 0.30, consistency: 0.20, volume: 0.10},
      "Professional": {time: 0.35, accuracy: 0.30, consistency: 0.20, volume: 0.15},
      "Expert": {time: 0.30, accuracy: 0.30, consistency: 0.25, volume: 0.15},
      "Master": {time: 0.25, accuracy: 0.30, consistency: 0.25, volume: 0.20},
    };
    const weights = WEIGHTS[currentRank] || WEIGHTS["Novice"];

    const rawPercentage =
      timeScore * weights.time +
      accuracyScore * weights.accuracy +
      consistencyScore * weights.consistency +
      volumeScore * weights.volume;

    const finalPercentage = Math.min(100, Math.max(0, rawPercentage));

    // Update user rank percentage
    await userRef.update({
      rankPercentage: Math.round(finalPercentage * 10) / 10,
      lastRankUpdateAt: admin.firestore.Timestamp.now(),
      rankBreakdown: {
        timeScore: Math.round(timeScore),
        accuracyScore: Math.round(accuracyScore),
        consistencyScore: Math.round(consistencyScore),
        volumeScore: Math.round(volumeScore),
      },
    });

    logger.info(`Rank updated for user ${userId}: ${finalPercentage}%`);

    return {
      success: true,
      message: "Rank updated successfully",
      rankPercentage: Math.round(finalPercentage * 10) / 10,
      breakdown: {
        timeScore: Math.round(timeScore),
        accuracyScore: Math.round(accuracyScore),
        consistencyScore: Math.round(consistencyScore),
        volumeScore: Math.round(volumeScore),
      },
      currentRank,
    };
  } catch (error) {
    logger.error("Error in recalculateMyRank:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Inactivity Detection Job
 * Runs weekly on Sundays at 3 AM UTC
 * Flags users with 30+ day activity gaps
 */
exports.inactivityDetection = onSchedule({
  schedule: "0 3 * * 0", // 3 AM UTC every Sunday
  timeoutSeconds: 300, // 5 minutes
  retryConfig: {
    retryCount: 3,
    maxRetrySeconds: 3600,
  },
}, async (event) => {
  const startTime = Date.now();
  let flaggedUsers = 0;
  let notifiedUsers = 0;
  let errorCount = 0;

  try {
    logger.info("Starting weekly inactivity detection job");

    const now = admin.firestore.Timestamp.now();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Find users who haven't been active in 30+ days
    const inactiveUsersSnapshot = await db
        .collection("users")
        .where("lastActive", "<", admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
        .limit(500) // Process 500 users per run
        .get();

    const batch = db.batch();

    for (const userDoc of inactiveUsersSnapshot.docs) {
      try {
        const userId = userDoc.id;
        const userData = userDoc.data();

        const daysSinceActive = Math.floor(
            (now.toMillis() - userData.lastActive.toMillis()) /
          (1000 * 60 * 60 * 24),
        );

        // Increment inactivity streak counter
        const newStreakCount = (userData.inactivityStreaks || 0) + 1;

        batch.update(userDoc.ref, {
          inactivityStreaks: newStreakCount,
          lastInactivityCheck: now,
        });

        flaggedUsers++;

        // Send notification after 60 days of inactivity
        if (daysSinceActive >= 60) {
          // TODO: Integrate with notification service
          logger.info(`User ${userId} inactive for ${daysSinceActive} days`);
          notifiedUsers++;
        }
      } catch (error) {
        logger.error(`Error processing user ${userDoc.id}:`, error);
        errorCount++;
      }
    }

    if (flaggedUsers > 0) {
      await batch.commit();
    }

    const duration = Date.now() - startTime;

    logger.info(
        "Inactivity detection complete",
        {
          flaggedUsers,
          notifiedUsers,
          errorCount,
          durationMs: duration,
        },
    );

    return {
      success: true,
      flaggedUsers,
      notifiedUsers,
      errorCount,
      durationMs: duration,
    };
  } catch (error) {
    logger.error("Fatal error in inactivity detection:", error);
    throw error;
  }
});

/**
 * Rank Promotion Check Job
 * Runs after daily rank recalculation
 * Checks if users are eligible for rank upgrades based on time gates
 */
exports.rankPromotionCheck = onSchedule({
  schedule: "30 2 * * *", // 2:30 AM UTC daily (30 min after recalculation)
  timeoutSeconds: 300, // 5 minutes
  memory: "256MiB",
  retryConfig: {
    retryCount: 3,
    maxRetrySeconds: 3600,
  },
}, async (event) => {
  const startTime = Date.now();
  let checkedUsers = 0;
  let promotedUsers = 0;
  let errorCount = 0;

  try {
    logger.info("Starting rank promotion check job");

    // Time gates for each rank (in days)
    const TIME_GATES = {
      "Novice": 0,
      "Amateur": 30,
      "Analyst": 150,
      "Professional": 300,
      "Expert": 480,
      "Master": 730,
    };

    const RANK_ORDER = [
      "Novice",
      "Amateur",
      "Analyst",
      "Professional",
      "Expert",
      "Master",
    ];

    // Get users at 100% rank percentage
    const eligibleUsersSnapshot = await db
        .collection("users")
        .where("rankPercentage", ">=", 99.9) // Allow for floating point precision
        .limit(200)
        .get();

    const batch = db.batch();

    for (const userDoc of eligibleUsersSnapshot.docs) {
      try {
        const userId = userDoc.id;
        const userData = userDoc.data();

        const currentRank = userData.currentRank || "Novice";
        const currentRankStartDate = userData.currentRankStartDate ?
          (userData.currentRankStartDate.toDate ?
            userData.currentRankStartDate.toDate() :
            new Date(userData.currentRankStartDate)) :
          new Date();

        // Calculate days in current rank
        const daysInCurrentRank = Math.floor(
            (Date.now() - currentRankStartDate.getTime()) /
          (1000 * 60 * 60 * 24),
        );

        // Get next rank
        const currentRankIndex = RANK_ORDER.indexOf(currentRank);
        if (currentRankIndex === -1 || currentRankIndex === RANK_ORDER.length - 1) {
          continue; // Already at max rank or invalid rank
        }

        const nextRank = RANK_ORDER[currentRankIndex + 1];
        const nextRankTimeGate = TIME_GATES[nextRank];

        // Check if time gate is met
        if (daysInCurrentRank >= nextRankTimeGate) {
          // Promote user
          const now = admin.firestore.Timestamp.now();

          batch.update(userDoc.ref, {
            currentRank: nextRank,
            rankPercentage: 0, // Reset percentage for new rank
            currentRankStartDate: now,
            lastRankUpdateAt: now,
          });

          // Add to rank history
          const historyRef = db.collection("rankHistory").doc();
          batch.set(historyRef, {
            userId,
            previousRank: currentRank,
            newRank: nextRank,
            timestamp: now,
            trigger: "auto_promotion",
            percentage: 100,
          });

          promotedUsers++;

          logger.info(
              `User ${userId} promoted from ${currentRank} to ${nextRank}`,
          );

          // TODO: Send celebration notification
        }

        checkedUsers++;
      } catch (error) {
        logger.error(`Error processing user ${userDoc.id}:`, error);
        errorCount++;
      }
    }

    if (promotedUsers > 0) {
      await batch.commit();
    }

    const duration = Date.now() - startTime;

    logger.info(
        "Rank promotion check complete",
        {
          checkedUsers,
          promotedUsers,
          errorCount,
          durationMs: duration,
        },
    );

    return {
      success: true,
      checkedUsers,
      promotedUsers,
      errorCount,
      durationMs: duration,
    };
  } catch (error) {
    logger.error("Fatal error in rank promotion check:", error);
    throw error;
  }
});

// ==================== ADMIN FUNCTIONS ====================

/**
 * Helper function to verify admin access
 * @param {object} auth - Firebase auth context
 * @return {boolean} true if user is admin
 */
function isAdmin(auth) {
  if (!auth) {
    return false;
  }
  // Check custom claim
  if (auth.token && auth.token.admin === true) {
    return true;
  }
  // Fallback: check email (less secure but useful during setup)
  const adminEmail = process.env.ADMIN_EMAIL || "yerinssaibs@gmail.com";
  return auth.token.email === adminEmail;
}

/**
 * Log admin action for audit trail
 * @param {string} action - Action type
 * @param {string} adminEmail - Admin email
 * @param {object} details - Additional details
 * @return {Promise} Firestore write promise
 */
async function logAdminAction(action, adminEmail, details) {
  return db.collection("admin_logs").add({
    action,
    adminEmail,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    details,
  });
}

/**
 * Create a new prediction (admin only)
 */
exports.createPrediction = onCall(async (request) => {
  const {auth, data} = request;

  if (!isAdmin(auth)) {
    throw new HttpsError("permission-denied", "Unauthorized: Admin access required");
  }

  const {
    question,
    description,
    categoryId,
    startTime,
    endTime,
    resolutionTime,
    options,
    coverImage,
    difficulty,
    featured,
    tags,
  } = data;

  // Validate required fields
  if (!question || !categoryId || !endTime || !options || options.length < 2) {
    throw new HttpsError("invalid-argument", "Missing required fields");
  }

  try {
    const now = admin.firestore.Timestamp.now();
    const predictionData = {
      question,
      description: description || "",
      categoryId,
      creatorId: auth.uid,
      status: startTime && admin.firestore.Timestamp.fromDate(new Date(startTime)) > now ? "scheduled" : "active",
      published: true,
      createdAt: now,
      updatedAt: now,
      startTime: startTime ? admin.firestore.Timestamp.fromDate(new Date(startTime)) : now,
      endTime: admin.firestore.Timestamp.fromDate(new Date(endTime)),
      resolutionTime: resolutionTime ? admin.firestore.Timestamp.fromDate(new Date(resolutionTime)) : null,
      options: options.map((opt, index) => ({
        id: `option_${index}`,
        label: opt.label,
        votes: 0,
        icon: opt.icon || null,
      })),
      totalVotes: 0,
      coverImage: coverImage || null,
      difficulty: difficulty || 1,
      featured: featured || false,
      tags: tags || [],
    };

    const predictionRef = await db.collection("predictions").add(predictionData);

    await logAdminAction("CREATE_PREDICTION", auth.token.email, {
      predictionId: predictionRef.id,
      question,
    });

    return {
      success: true,
      predictionId: predictionRef.id,
    };
  } catch (error) {
    logger.error("Error creating prediction:", error);
    throw new HttpsError("internal", "Failed to create prediction");
  }
});

/**
 * Resolve a prediction (admin only)
 */
exports.resolvePrediction = onCall(async (request) => {
  const {auth, data} = request;

  if (!isAdmin(auth)) {
    throw new HttpsError("permission-denied", "Unauthorized: Admin access required");
  }

  const {predictionId, winningOptionId, explanation, sourceLink} = data;

  if (!predictionId || !winningOptionId) {
    throw new HttpsError("invalid-argument", "Missing required fields");
  }

  try {
    const predictionRef = db.collection("predictions").doc(predictionId);
    const predictionDoc = await predictionRef.get();

    if (!predictionDoc.exists) {
      throw new HttpsError("not-found", "Prediction not found");
    }

    const predictionData = predictionDoc.data();

    // Check if already resolved
    if (predictionData.status === "resolved") {
      throw new HttpsError("failed-precondition", "Prediction already resolved");
    }

    const now = admin.firestore.Timestamp.now();
    const batch = db.batch();

    // Update prediction
    batch.update(predictionRef, {
      status: "resolved",
      winningOption: winningOptionId,
      resolutionTime: now,
      resolutionExplanation: explanation || null,
      resolutionSource: sourceLink || null,
      resolvedBy: auth.uid,
      updatedAt: now,
    });

    // Get all votes for this prediction
    const votesSnapshot = await db.collection("votes")
        .where("predictionId", "==", predictionId)
        .get();

    let correctCount = 0;
    let incorrectCount = 0;

    // Update votes and user stats
    for (const voteDoc of votesSnapshot.docs) {
      const voteData = voteDoc.data();
      const isCorrect = voteData.option === winningOptionId;

      if (isCorrect) correctCount++;
      else incorrectCount++;

      // Update vote document
      batch.update(voteDoc.ref, {
        isCorrect,
        resolvedAt: now,
      });

      // Update user stats
      const userRef = db.collection("users").doc(voteData.userId);
      batch.update(userRef, {
        totalPredictions: admin.firestore.FieldValue.increment(1),
        correctPredictions: isCorrect ? admin.firestore.FieldValue.increment(1) : admin.firestore.FieldValue.increment(0),
        updatedAt: now,
      });
    }

    await batch.commit();

    await logAdminAction("RESOLVE_PREDICTION", auth.token.email, {
      predictionId,
      winningOption: winningOptionId,
      correctCount,
      incorrectCount,
      explanation,
    });

    return {
      success: true,
      correctCount,
      incorrectCount,
    };
  } catch (error) {
    logger.error("Error resolving prediction:", error);
    throw new HttpsError("internal", "Failed to resolve prediction");
  }
});

/**
 * Manually promote user rank (admin only)
 */
exports.promoteUser = onCall(async (request) => {
  const {auth, data} = request;

  if (!isAdmin(auth)) {
    throw new HttpsError("permission-denied", "Unauthorized: Admin access required");
  }

  const {userId, newRank, reason} = data;

  if (!userId || !newRank || !reason) {
    throw new HttpsError("invalid-argument", "Missing required fields");
  }

  const validRanks = ["novice", "amateur", "analyst", "professional", "expert", "master"];
  if (!validRanks.includes(newRank)) {
    throw new HttpsError("invalid-argument", "Invalid rank");
  }

  try {
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User not found");
    }

    const userData = userDoc.data();
    const oldRank = userData.rank || "novice";

    const now = admin.firestore.Timestamp.now();
    const batch = db.batch();

    // Update user rank
    batch.update(userRef, {
      rank: newRank,
      rankPercentage: 0, // Reset percentage for new rank
      manuallyAdjusted: true,
      lastPromotedAt: now,
      updatedAt: now,
    });

    // Add to rank history
    const historyRef = db.collection("rankHistory").doc();
    batch.set(historyRef, {
      userId,
      previousRank: oldRank,
      newRank,
      timestamp: now,
      trigger: "manual_promotion",
      adminEmail: auth.token.email,
      reason,
      percentage: 0,
    });

    await batch.commit();

    await logAdminAction("PROMOTE_USER", auth.token.email, {
      userId,
      oldRank,
      newRank,
      reason,
    });

    return {
      success: true,
      oldRank,
      newRank,
    };
  } catch (error) {
    logger.error("Error promoting user:", error);
    throw new HttpsError("internal", "Failed to promote user");
  }
});

/**
 * Get admin dashboard stats
 */
exports.getAdminStats = onCall({
  memory: "256MiB",
  timeoutSeconds: 30,
}, async (request) => {
  const {auth} = request;

  if (!isAdmin(auth)) {
    throw new HttpsError("permission-denied", "Unauthorized: Admin access required");
  }

  try {
    // Get total users
    const usersSnapshot = await db.collection("users").count().get();
    const totalUsers = usersSnapshot.data().count;

    // Get active users (last 7 days)
    const sevenDaysAgo = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    );
    const activeUsersSnapshot = await db.collection("users")
        .where("lastActive", ">=", sevenDaysAgo)
        .count()
        .get();
    const activeUsers = activeUsersSnapshot.data().count;

    // Get predictions by status
    const activePredictionsSnapshot = await db.collection("predictions")
        .where("status", "==", "active")
        .count()
        .get();
    const resolvedPredictionsSnapshot = await db.collection("predictions")
        .where("status", "==", "resolved")
        .count()
        .get();
    const closedPredictionsSnapshot = await db.collection("predictions")
        .where("status", "==", "closed")
        .count()
        .get();

    // Get rank distribution
    const rankDistribution = {};
    const ranks = ["novice", "amateur", "analyst", "professional", "expert", "master"];
    for (const rank of ranks) {
      const snapshot = await db.collection("users")
          .where("rank", "==", rank)
          .count()
          .get();
      rankDistribution[rank] = snapshot.data().count;
    }

    return {
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        predictions: {
          active: activePredictionsSnapshot.data().count,
          resolved: resolvedPredictionsSnapshot.data().count,
          closed: closedPredictionsSnapshot.data().count,
        },
        rankDistribution,
      },
    };
  } catch (error) {
    logger.error("Error getting admin stats:", error);
    throw new HttpsError("internal", "Failed to get admin stats");
  }
});

/**
 * Scheduled function to update prediction statuses
 * Runs every 5 minutes to:
 * 1. Change scheduled predictions to active when start time passes
 * 2. Change active predictions to closed when end time passes
 */
exports.updatePredictionStatuses = onSchedule({
  schedule: "every 5 minutes",
  timeZone: "America/New_York",
  memory: "256MiB",
}, async (context) => {
  try {
    const now = admin.firestore.Timestamp.now();
    const batch = db.batch();
    let updatedCount = 0;

    // Update scheduled predictions to active
    const scheduledSnapshot = await db.collection("predictions")
        .where("status", "==", "scheduled")
        .where("startTime", "<=", now)
        .get();

    scheduledSnapshot.forEach((doc) => {
      batch.update(doc.ref, {status: "active", updatedAt: now});
      updatedCount++;
      logger.info(`Updating prediction ${doc.id} from scheduled to active`);
    });

    // Update active predictions to closed when end time passes
    const activeSnapshot = await db.collection("predictions")
        .where("status", "==", "active")
        .where("endTime", "<=", now)
        .get();

    activeSnapshot.forEach((doc) => {
      batch.update(doc.ref, {status: "closed", updatedAt: now});
      updatedCount++;
      logger.info(`Updating prediction ${doc.id} from active to closed`);
    });

    if (updatedCount > 0) {
      await batch.commit();
      logger.info(`Updated ${updatedCount} prediction statuses`);
    }

    return {success: true, updated: updatedCount};
  } catch (error) {
    logger.error("Error updating prediction statuses:", error);
    throw error;
  }
});
/**
 * Manual trigger to update prediction statuses (Admin only)
 * Can be called from admin dashboard to immediately update statuses
 */
exports.manualUpdateStatuses = onCall(async (request) => {
  const {auth} = request;

  // Check authentication
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  // Check if user is admin
  const userDoc = await db.collection("users").doc(auth.uid).get();
  if (!userDoc.exists || userDoc.data().role !== "admin") {
    throw new HttpsError(
        "permission-denied",
        "Only admins can manually update statuses",
    );
  }

  try {
    const now = admin.firestore.Timestamp.now();
    const batch = db.batch();
    let updatedCount = 0;

    // Update scheduled predictions to active
    const scheduledSnapshot = await db.collection("predictions")
        .where("status", "==", "scheduled")
        .where("startTime", "<=", now)
        .get();

    scheduledSnapshot.forEach((doc) => {
      batch.update(doc.ref, {status: "active", updatedAt: now});
      updatedCount++;
      logger.info(`Manually updating prediction ${doc.id} from scheduled to active`);
    });

    // Update active predictions to closed when end time passes
    const activeSnapshot = await db.collection("predictions")
        .where("status", "==", "active")
        .where("endTime", "<=", now)
        .get();

    activeSnapshot.forEach((doc) => {
      batch.update(doc.ref, {status: "closed", updatedAt: now});
      updatedCount++;
      logger.info(`Manually updating prediction ${doc.id} from active to closed`);
    });

    if (updatedCount > 0) {
      await batch.commit();
      logger.info(`Manually updated ${updatedCount} prediction statuses`);
    }

    return {
      success: true,
      message: `Updated ${updatedCount} prediction${updatedCount !== 1 ? "s" : ""}`,
      updated: updatedCount,
    };
  } catch (error) {
    logger.error("Error manually updating statuses:", error);
    throw new HttpsError("internal", "Failed to update statuses");
  }
});