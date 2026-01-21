const {onCall, HttpsError, onRequest} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

/**
 * Share preview for social media crawlers
 * Generates dynamic preview with question, options, and vote percentages
 * URL: https://truthvote.io/share?id=PREDICTION_ID
 */
exports.sharePreview = onRequest({cors: true}, async (req, res) => {
  try {
    const predictionId = req.query.id;
    logger.info('sharePreview called', { predictionId, userAgent: req.get('user-agent') });
    
    if (!predictionId) {
      logger.info('No prediction ID, redirecting to home');
      res.redirect('https://truthvote.io');
      return;
    }

    // Detect crawlers
    const userAgent = (req.get('user-agent') || '').toLowerCase();
    const isCrawler = 
      userAgent.includes('facebookexternalhit') ||
      userAgent.includes('twitterbot') ||
      userAgent.includes('whatsapp') ||
      userAgent.includes('linkedinbot') ||
      userAgent.includes('slackbot') ||
      userAgent.includes('discordbot') ||
      userAgent.includes('telegrambot') ||
      userAgent.includes('bot') ||
      userAgent.includes('crawl') ||
      userAgent.includes('spider');
    
    logger.info('Crawler detection', { isCrawler, userAgent });

    const baseUrl = 'https://truthvote.io';
    const targetUrl = `${baseUrl}/prediction?id=${predictionId}`;

    // Regular users get redirected
    if (!isCrawler) {
      logger.info('Not a crawler, redirecting to prediction page');
      res.redirect(targetUrl);
      return;
    }

    // Fetch prediction
    logger.info('Fetching prediction from Firestore', { predictionId });
    const predictionDoc = await db.collection('predictions').doc(predictionId).get();
    
    if (!predictionDoc.exists) {
      logger.info('Prediction not found, redirecting to home');
      res.redirect('https://truthvote.io');
      return;
    }
    
    logger.info('Prediction found, generating preview');

    const prediction = predictionDoc.data();
    const question = prediction.question || 'Make a Prediction';
    const thumbnailUrl = prediction.imageUrl || '';
    
    // Build options data with vote percentages
    let options = [];
    let totalVotes = 0;
    
    if (prediction.optionA && prediction.optionB) {
      const votesA = prediction.votesA || 0;
      const votesB = prediction.votesB || 0;
      totalVotes = votesA + votesB;
      const percentA = totalVotes > 0 ? Math.round((votesA / totalVotes) * 100) : 50;
      const percentB = totalVotes > 0 ? Math.round((votesB / totalVotes) * 100) : 50;
      options = [
        { label: prediction.optionA, percent: percentA },
        { label: prediction.optionB, percent: percentB }
      ];
    } else if (prediction.options && Array.isArray(prediction.options) && prediction.options.length > 0) {
      const isMultiYesNo = prediction.displayTemplate === 'multi-yes-no';
      
      if (isMultiYesNo) {
        const sortedOptions = [...prediction.options].sort((a, b) => (b.votesYes || 0) - (a.votesYes || 0));
        options = sortedOptions.slice(0, 3).map(opt => {
          const total = (opt.votesYes || 0) + (opt.votesNo || 0);
          const percent = total > 0 ? Math.round((opt.votesYes / total) * 100) : 50;
          totalVotes += total;
          return { label: opt.label, percent };
        });
      } else {
        totalVotes = prediction.options.reduce((sum, opt) => sum + (opt.votes || 0), 0);
        options = prediction.options.slice(0, 3).map(opt => {
          const percent = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
          return { label: opt.label, percent };
        });
      }
    }

    // Build rich description with options and percentages
    const optionsText = options.map(o => `${o.label} (${o.percent}%)`).join(' vs ');
    const description = optionsText 
      ? `📊 ${optionsText} | ${totalVotes.toLocaleString()} votes | Vote now on TruthVote!` 
      : 'Make your prediction on TruthVote!';

    // Generate Cloudinary dynamic image URL
    // Set your Cloudinary cloud name here
    const CLOUDINARY_CLOUD_NAME = 'dgfdbfyeo';
    
    let imageUrl = thumbnailUrl || 'https://truthvote.io/assets/tv_logo_icon_transparent.png';
    
    // Only generate Cloudinary URL if cloud name is configured
    if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_CLOUD_NAME !== 'YOUR_CLOUD_NAME') {
      try {
        // Helper to encode text for Cloudinary URL
        const encodeCloudinaryText = (text) => {
          return encodeURIComponent(text)
            .replace(/%2C/g, '%252C')
            .replace(/%2F/g, '%252F');
        };

        // Truncate question if too long
        const displayQuestion = question.length > 50 
          ? question.substring(0, 47) + '...' 
          : question;

        // Build transformations array
        let transforms = [];
        
        // Base: White background, 1200x630 (standard OG image size)
        transforms.push('w_1200,h_630,c_fill,b_rgb:FFFFFF');
        
        // Add thumbnail on LEFT side (takes up ~45% of width)
        if (thumbnailUrl) {
          const encodedThumb = Buffer.from(thumbnailUrl).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
          transforms.push(`l_fetch:${encodedThumb},w_520,h_550,c_fill,r_16,g_west,x_30,y_0`);
        }
        
        // Right side content starts at x=580
        const rightX = thumbnailUrl ? 580 : 50;
        const contentWidth = thumbnailUrl ? 580 : 1100;
        
        // TruthVote logo/brand at top right area
        transforms.push(`l_text:arial_20_bold:TRUTHVOTE,co_rgb:3B82F6,g_north_west,x_${rightX},y_35`);
        
        // Question text (split into 2 lines if needed)
        const words = displayQuestion.split(' ');
        let qLine1 = '';
        let qLine2 = '';
        const maxChars = thumbnailUrl ? 28 : 50;
        for (const word of words) {
          if (qLine1.length + word.length < maxChars) {
            qLine1 = qLine1 ? qLine1 + ' ' + word : word;
          } else {
            qLine2 = qLine2 ? qLine2 + ' ' + word : word;
          }
        }
        
        transforms.push(`l_text:arial_26_bold:${encodeCloudinaryText(qLine1)},co_rgb:1F2937,g_north_west,x_${rightX},y_70`);
        if (qLine2) {
          transforms.push(`l_text:arial_26_bold:${encodeCloudinaryText(qLine2.substring(0, maxChars))},co_rgb:1F2937,g_north_west,x_${rightX},y_105`);
        }
        
        // Options section - styled like actual UI
        const optStartY = qLine2 ? 160 : 130;
        const barWidth = thumbnailUrl ? 500 : 900;
        
        // For each option, create a "card-like" appearance
        options.slice(0, 3).forEach((opt, i) => {
          const optLabel = opt.label.length > 18 ? opt.label.substring(0, 15) + '...' : opt.label;
          const yPos = optStartY + (i * 130);
          const color = opt.percent > 50 ? '22C55E' : '3B82F6';
          const bgColor = opt.percent > 50 ? 'DCFCE7' : 'DBEAFE';
          
          // Option container background (light colored box)
          transforms.push(`l_text:arial_16:%20,co_rgb:${bgColor},b_rgb:${bgColor},g_north_west,x_${rightX},y_${yPos},w_${barWidth},h_100`);
          
          // Option label (left side)
          transforms.push(`l_text:arial_22_bold:${encodeCloudinaryText(optLabel)},co_rgb:1F2937,g_north_west,x_${rightX + 15},y_${yPos + 15}`);
          
          // Large percentage (right side of the box)
          transforms.push(`l_text:arial_36_bold:${opt.percent}%2525,co_rgb:${color},g_north_west,x_${rightX + barWidth - 100},y_${yPos + 12}`);
          
          // Progress bar background (gray line)
          const barY = yPos + 60;
          const progressBarBg = '_'.repeat(Math.floor(barWidth / 12));
          transforms.push(`l_text:arial_14:${encodeCloudinaryText(progressBarBg)},co_rgb:E5E7EB,g_north_west,x_${rightX + 15},y_${barY}`);
          
          // Progress bar fill (colored portion based on percentage)
          const fillWidth = Math.max(1, Math.floor((opt.percent / 100) * (barWidth / 12)));
          if (fillWidth > 0) {
            const progressBarFill = '_'.repeat(fillWidth);
            transforms.push(`l_text:arial_14:${encodeCloudinaryText(progressBarFill)},co_rgb:${color},g_north_west,x_${rightX + 15},y_${barY}`);
          }
        });
        
        // Bottom bar with vote count and branding
        transforms.push(`l_text:arial_18:${encodeCloudinaryText(totalVotes.toLocaleString() + ' votes')},co_rgb:6B7280,g_south_west,x_${rightX},y_30`);
        transforms.push(`l_text:arial_18_bold:truthvote.io,co_rgb:3B82F6,g_south_east,x_50,y_30`);

        // Use Wikipedia's 1x1 transparent PNG as base (Cloudinary will expand it)
        const blankImageUrl = 'https://upload.wikimedia.org/wikipedia/commons/c/ca/1x1.png';
        
        imageUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/fetch/${transforms.join('/')}/${blankImageUrl}`;
        
        logger.info('Generated Cloudinary URL', { urlLength: imageUrl.length });
      } catch (cloudinaryError) {
        logger.error('Cloudinary URL generation failed, using fallback', cloudinaryError);
        imageUrl = thumbnailUrl || 'https://truthvote.io/assets/tv_logo_icon_transparent.png';
      }
    }

    // Escape HTML
    const esc = (text) => String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(question)} - TruthVote</title>
  <meta name="description" content="${esc(description)}">
  
  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${targetUrl}">
  <meta property="og:title" content="${esc(question)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="TruthVote">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(question)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${imageUrl}">
  
  <meta http-equiv="refresh" content="0;url=${targetUrl}">
</head>
<body>
  <h1>${esc(question)}</h1>
  <p>${esc(description)}</p>
  <a href="${targetUrl}">Go to TruthVote</a>
</body>
</html>`;

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=60, s-maxage=120');
    res.status(200).send(html);
  } catch (error) {
    logger.error('Share preview error:', error);
    res.redirect('https://truthvote.io');
  }
});

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
 * Track when a user shares a prediction
 * Increments user's share count for ranking rewards
 */
exports.trackShare = onCall(async (request) => {
  const {auth, data} = request;

  // Check authentication
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {predictionId, shareMethod} = data;

  // Validate inputs
  if (!predictionId) {
    throw new HttpsError("invalid-argument", "Missing predictionId");
  }

  const userId = auth.uid;

  try {
    // Update user's share count
    const userRef = db.collection("users").doc(userId);
    await userRef.update({
      totalShares: admin.firestore.FieldValue.increment(1),
      lastActive: admin.firestore.Timestamp.now(),
    });

    // Optionally track share analytics
    await db.collection("shares").add({
      userId,
      predictionId,
      shareMethod: shareMethod || "unknown", // 'twitter', 'whatsapp', 'copy', 'native'
      sharedAt: admin.firestore.Timestamp.now(),
    });

    logger.info(`Share tracked: ${userId} shared ${predictionId} via ${shareMethod}`);

    return {
      success: true,
      message: "Share tracked successfully",
    };
  } catch (error) {
    logger.error("Error tracking share:", error);
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

    // Get ALL users - some may have 'rank' field, others 'currentRank'
    // Query all users and filter in code to handle both cases
    const usersSnapshot = await db
        .collection("users")
        .get();

    // Filter to only users who are actual user accounts (have createdAt)
    const allUsers = usersSnapshot.docs.filter((doc) => {
      const data = doc.data();
      return data.createdAt !== undefined;
    });

    logger.info(`Found ${allUsers.length} users to process`);

    // Process in batches of 100
    const BATCH_SIZE = 100;
    const users = allUsers;

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
              // Handle both 'currentRank' and legacy 'rank' field
              // Normalize rank name (some might be lowercase)
              let rawRank = userData.currentRank || userData.rank || "Novice";
              // Capitalize first letter to ensure consistent format
              const currentRank = rawRank.charAt(0).toUpperCase() + rawRank.slice(1).toLowerCase();
              
              // TIME_GATES: Days required to reach EACH rank from account creation
              const RANK_TIME_GATES = {
                "Novice": 0,      // Entry rank
                "Amateur": 7,     // 7 days to reach Amateur
                "Analyst": 60,    // 60 days to reach Analyst
                "Professional": 120, // 120 days to reach Professional
                "Expert": 240,    // 240 days to reach Expert
                "Master": 365,    // 365 days to reach Master
              };
              
              // Get the time gates for current rank and next rank
              const RANK_ORDER = ["Novice", "Amateur", "Analyst", "Professional", "Expert", "Master"];
              const currentRankIndex = RANK_ORDER.indexOf(currentRank);
              const nextRank = currentRankIndex < RANK_ORDER.length - 1 ? RANK_ORDER[currentRankIndex + 1] : null;
              
              let timeScore = 100; // Default to 100 if at max rank
              
              if (nextRank) {
                const currentRankGate = RANK_TIME_GATES[currentRank] || 0;
                const nextRankGate = RANK_TIME_GATES[nextRank];
                const daysNeeded = nextRankGate - currentRankGate;
                const daysProgress = accountAgeDays - currentRankGate;
                
                // Calculate progress from current rank gate to next rank gate
                timeScore = daysNeeded > 0 ? Math.min(100, Math.max(0, (daysProgress / daysNeeded) * 100)) : 100;
              }

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

              // Volume/Engagement score (0-100) - includes predictions AND shares
              // Shares boost engagement score significantly
              const totalPredictions = totalVotes;
              const totalShares = userData.totalShares || 0;
              
              const MIN_PREDICTIONS = {
                "Novice": 3,
                "Amateur": 10,
                "Analyst": 30,
                "Professional": 60,
                "Expert": 100,
                "Master": 150,
              };
              const minPreds = MIN_PREDICTIONS[currentRank] || 3;
              
              // Base volume score from predictions
              let volumeScore = totalPredictions >= minPreds ? 100 : Math.min(100, (totalPredictions / minPreds) * 100);
              
              // Shares bonus: Each share adds 2% to volume score (max 20% bonus)
              // This rewards active community engagement
              const shareBonus = Math.min(20, totalShares * 2);
              volumeScore = Math.min(100, volumeScore + shareBonus);

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

              // Build update object - always set currentRank to ensure consistency
              const updateData = {
                rankPercentage: Math.round(finalPercentage * 10) / 10,
                lastRankUpdateAt: admin.firestore.Timestamp.now(),
                currentRank: currentRank, // Ensure currentRank is always set
                // Store breakdown for debugging
                rankBreakdown: {
                  timeScore: Math.round(timeScore),
                  accuracyScore: Math.round(accuracyScore),
                  consistencyScore: Math.round(consistencyScore),
                  volumeScore: Math.round(volumeScore),
                  accountAgeDays: accountAgeDays,
                  totalShares: totalShares,
                  shareBonus: shareBonus,
                },
              };

              // If user is missing currentRankStartDate, set it to createdAt
              if (!userData.currentRankStartDate) {
                updateData.currentRankStartDate = createdAt;
              }

              // Initialize missing rank-related fields
              if (userData.rankUpgradeHistory === undefined) {
                updateData.rankUpgradeHistory = [];
              }
              if (userData.weeklyActivityCount === undefined) {
                updateData.weeklyActivityCount = 0;
              }
              if (userData.totalResolvedPredictions === undefined) {
                updateData.totalResolvedPredictions = 0;
              }

              // Update user rank percentage
              await db.collection("users").doc(userId).update(updateData);

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
  cors: true,
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

    // Handle both 'currentRank' and legacy 'rank' field
    let rawRank = userData.currentRank || userData.rank || "Novice";
    // Capitalize first letter to ensure consistent format
    const currentRank = rawRank.charAt(0).toUpperCase() + rawRank.slice(1).toLowerCase();
    
    // TIME_GATES: Days required to reach EACH rank from account creation
    const RANK_TIME_GATES = {
      "Novice": 0,      // Entry rank
      "Amateur": 7,     // 7 days to reach Amateur
      "Analyst": 60,    // 60 days to reach Analyst
      "Professional": 120, // 120 days to reach Professional
      "Expert": 240,    // 240 days to reach Expert
      "Master": 365,    // 365 days to reach Master
    };
    
    // Get the time gates for current rank and next rank
    const RANK_ORDER = ["Novice", "Amateur", "Analyst", "Professional", "Expert", "Master"];
    const currentRankIndex = RANK_ORDER.indexOf(currentRank);
    const nextRank = currentRankIndex < RANK_ORDER.length - 1 ? RANK_ORDER[currentRankIndex + 1] : null;
    
    let timeScore = 100; // Default to 100 if at max rank
    
    if (nextRank) {
      const currentRankGate = RANK_TIME_GATES[currentRank] || 0;
      const nextRankGate = RANK_TIME_GATES[nextRank];
      const daysNeeded = nextRankGate - currentRankGate;
      const daysProgress = accountAgeDays - currentRankGate;
      
      // Calculate progress from current rank gate to next rank gate
      timeScore = daysNeeded > 0 ? Math.min(100, Math.max(0, (daysProgress / daysNeeded) * 100)) : 100;
    }

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

    // Volume/Engagement score (0-100) - includes predictions AND shares
    const totalPredictions = totalVotes;
    const totalShares = userData.totalShares || 0;
    
    const MIN_PREDICTIONS = {
      "Novice": 3,
      "Amateur": 10,
      "Analyst": 30,
      "Professional": 60,
      "Expert": 100,
      "Master": 150,
    };
    const minPreds = MIN_PREDICTIONS[currentRank] || 3;
    
    // Base volume score from predictions
    let volumeScore = totalPredictions >= minPreds ? 100 : Math.min(100, (totalPredictions / minPreds) * 100);
    
    // Shares bonus: Each share adds 2% to volume score (max 20% bonus)
    const shareBonus = Math.min(20, totalShares * 2);
    volumeScore = Math.min(100, volumeScore + shareBonus);

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

    // Build update object - always set currentRank to ensure consistency
    const updateData = {
      rankPercentage: Math.round(finalPercentage * 10) / 10,
      lastRankUpdateAt: admin.firestore.Timestamp.now(),
      currentRank: currentRank, // Ensure currentRank is always set
      rankBreakdown: {
        timeScore: Math.round(timeScore),
        accuracyScore: Math.round(accuracyScore),
        consistencyScore: Math.round(consistencyScore),
        volumeScore: Math.round(volumeScore),
        accountAgeDays: accountAgeDays,
        totalShares: totalShares,
        shareBonus: shareBonus,
      },
    };

    // Initialize missing rank-related fields
    if (!userData.currentRankStartDate) {
      updateData.currentRankStartDate = createdAt;
    }
    if (userData.rankUpgradeHistory === undefined) {
      updateData.rankUpgradeHistory = [];
    }
    if (userData.weeklyActivityCount === undefined) {
      updateData.weeklyActivityCount = 0;
    }
    if (userData.totalResolvedPredictions === undefined) {
      updateData.totalResolvedPredictions = 0;
    }

    // Update user rank percentage
    await userRef.update(updateData);

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
        accountAgeDays: accountAgeDays,
        totalShares: totalShares,
        shareBonus: shareBonus,
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
  cors: true,
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

    // Handle both 'currentRank' and legacy 'rank' field
    let rawRank = userData.currentRank || userData.rank || "Novice";
    // Capitalize first letter to ensure consistent format
    const currentRank = rawRank.charAt(0).toUpperCase() + rawRank.slice(1).toLowerCase();
    
    // TIME_GATES: Days required to reach EACH rank from account creation
    // The time score should measure progress towards the NEXT rank
    const RANK_TIME_GATES = {
      "Novice": 0,      // Entry rank
      "Amateur": 7,     // 7 days to reach Amateur
      "Analyst": 60,    // 60 days to reach Analyst
      "Professional": 120, // 120 days to reach Professional
      "Expert": 240,    // 240 days to reach Expert
      "Master": 365,    // 365 days to reach Master
    };
    
    // Get the time gates for current rank and next rank
    const RANK_ORDER = ["Novice", "Amateur", "Analyst", "Professional", "Expert", "Master"];
    const currentRankIndex = RANK_ORDER.indexOf(currentRank);
    const nextRank = currentRankIndex < RANK_ORDER.length - 1 ? RANK_ORDER[currentRankIndex + 1] : null;
    
    let timeScore = 100; // Default to 100 if at max rank
    
    if (nextRank) {
      const currentRankGate = RANK_TIME_GATES[currentRank] || 0;
      const nextRankGate = RANK_TIME_GATES[nextRank];
      const daysNeeded = nextRankGate - currentRankGate;
      const daysProgress = accountAgeDays - currentRankGate;
      
      // Calculate progress from current rank gate to next rank gate
      timeScore = daysNeeded > 0 ? Math.min(100, Math.max(0, (daysProgress / daysNeeded) * 100)) : 100;
    }

    const MIN_ACCURACY = {"Novice": 50, "Amateur": 55, "Analyst": 60, "Professional": 65, "Expert": 70, "Master": 75};
    const minAcc = MIN_ACCURACY[currentRank] || 50;
    const accuracyScore = accuracyRate >= minAcc ?
      Math.min(100, ((accuracyRate - minAcc) / (100 - minAcc)) * 100) : 0;

    const weeklyActivity = userData.weeklyActivityCount || 0;
    const MIN_WEEKS = {"Novice": 1, "Amateur": 2, "Analyst": 8, "Professional": 16, "Expert": 32, "Master": 48};
    const minWeeks = MIN_WEEKS[currentRank] || 1;
    const consistencyScore = weeklyActivity >= minWeeks ? 85 : Math.min(85, (weeklyActivity / minWeeks) * 85);

    // Volume/Engagement score (0-100) - includes predictions AND shares
    const totalPredictions = totalVotes;
    const totalShares = userData.totalShares || 0;
    
    const MIN_PREDICTIONS = {"Novice": 3, "Amateur": 10, "Analyst": 30, "Professional": 60, "Expert": 100, "Master": 150};
    const minPreds = MIN_PREDICTIONS[currentRank] || 3;
    
    // Base volume score from predictions
    let volumeScore = totalPredictions >= minPreds ? 100 : Math.min(100, (totalPredictions / minPreds) * 100);
    
    // Shares bonus: Each share adds 2% to volume score (max 20% bonus)
    const shareBonus = Math.min(20, totalShares * 2);
    volumeScore = Math.min(100, volumeScore + shareBonus);

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

    // Build update object - always set currentRank to ensure consistency
    const updateData = {
      rankPercentage: Math.round(finalPercentage * 10) / 10,
      lastRankUpdateAt: admin.firestore.Timestamp.now(),
      currentRank: currentRank, // Ensure currentRank is always set
      rankBreakdown: {
        timeScore: Math.round(timeScore),
        accuracyScore: Math.round(accuracyScore),
        consistencyScore: Math.round(consistencyScore),
        volumeScore: Math.round(volumeScore),
        accountAgeDays: accountAgeDays,
        totalShares: totalShares,
        shareBonus: shareBonus,
      },
    };

    // Initialize missing rank-related fields
    if (!userData.currentRankStartDate) {
      updateData.currentRankStartDate = createdAt;
    }
    if (userData.rankUpgradeHistory === undefined) {
      updateData.rankUpgradeHistory = [];
    }
    if (userData.weeklyActivityCount === undefined) {
      updateData.weeklyActivityCount = 0;
    }
    if (userData.totalResolvedPredictions === undefined) {
      updateData.totalResolvedPredictions = 0;
    }

    // Update user rank percentage
    await userRef.update(updateData);

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
        totalShares: totalShares,
        shareBonus: shareBonus,
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
  cors: true,
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

// ============================================
// RSS FEED & TRENDING TOPICS FUNCTIONS
// ============================================

const RSSParser = require("rss-parser");
const rssParser = new RSSParser({
  timeout: 10000,
  headers: {
    "User-Agent": "TruthVote News Aggregator/1.0",
  },
  customFields: {
    item: [
      ["media:content", "mediaContent"],
      ["media:thumbnail", "mediaThumbnail"],
      ["enclosure", "enclosure"],
      ["media:group", "mediaGroup"],
      ["image", "image"],
      ["content:encoded", "contentEncoded"],
      ["description", "description"],
    ],
  },
});

/**
 * Extract image URL from RSS item
 */
function extractImageFromRSSItem(item) {
  // Try different common RSS image fields
  
  // 1. Media content (most common for news)
  if (item.mediaContent && item.mediaContent.$) {
    return item.mediaContent.$.url;
  }
  
  // 2. Media thumbnail
  if (item.mediaThumbnail && item.mediaThumbnail.$) {
    return item.mediaThumbnail.$.url;
  }
  
  // 3. Enclosure (podcast/media feeds)
  if (item.enclosure && item.enclosure.url) {
    const type = item.enclosure.type || "";
    if (type.startsWith("image/")) {
      return item.enclosure.url;
    }
  }
  
  // 4. Media group (YouTube, etc)
  if (item.mediaGroup && item.mediaGroup["media:thumbnail"]) {
    const thumb = item.mediaGroup["media:thumbnail"];
    if (Array.isArray(thumb) && thumb[0] && thumb[0].$) {
      return thumb[0].$.url;
    }
  }
  
  // 5. Direct image field
  if (item.image) {
    if (typeof item.image === "string") return item.image;
    if (item.image.url) return item.image.url;
  }
  
  // 6. Try to extract from content/description HTML (WordPress feeds like Vanguard)
  const content = item.contentEncoded || item.content || item["content:encoded"] || item.description || "";
  
  // Try multiple image extraction patterns
  // Pattern 1: Standard img tag
  let imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch && imgMatch[1]) {
    // Avoid tracking pixels and small images
    const url = imgMatch[1];
    if (!url.includes('1x1') && !url.includes('pixel') && !url.includes('tracker')) {
      return url;
    }
  }
  
  // Pattern 2: WordPress featured image (common in Vanguard)
  imgMatch = content.match(/wp-content\/uploads\/[^"'\s]+\.(jpg|jpeg|png|webp|gif)/i);
  if (imgMatch && imgMatch[0]) {
    // Ensure it's a full URL
    const url = imgMatch[0];
    if (url.startsWith('http')) {
      return url;
    } else if (item.link) {
      // Construct full URL from the article link domain
      const domain = item.link.match(/(https?:\/\/[^\/]+)/);
      if (domain) {
        return domain[1] + '/' + url;
      }
    }
  }
  
  // Pattern 3: Background image in style attribute
  imgMatch = content.match(/background-image:\s*url\(['"]?([^'")\s]+)['"]?\)/i);
  if (imgMatch && imgMatch[1]) {
    return imgMatch[1];
  }
  
  // Pattern 4: Data-src (lazy loaded images)
  imgMatch = content.match(/<img[^>]+data-src=["']([^"']+)["']/i);
  if (imgMatch && imgMatch[1]) {
    return imgMatch[1];
  }
  
  return null;
}

// Default news sources configuration
const DEFAULT_NEWS_SOURCES = [
  {
    id: "bbc-sport-africa",
    name: "BBC Sport Africa",
    url: "https://feeds.bbci.co.uk/sport/africa/rss.xml",
    category: "Sports",
    icon: "⚽",
    region: "AFRICA",
  },
  {
    id: "premium-times",
    name: "Premium Times",
    url: "https://www.premiumtimesng.com/feed",
    category: "Politics",
    icon: "🗳️",
    region: "NG",
  },
  {
    id: "pulse-ng",
    name: "Pulse Nigeria",
    url: "https://www.pulse.ng/rss",
    category: "Entertainment",
    icon: "🎵",
    region: "NG",
  },
  {
    id: "the-cable",
    name: "The Cable",
    url: "https://www.thecable.ng/feed",
    category: "Politics",
    icon: "📰",
    region: "NG",
  },
  {
    id: "vanguard",
    name: "Vanguard",
    url: "https://www.vanguardngr.com/feed/",
    category: "General",
    icon: "📰",
    region: "NG",
  },
  {
    id: "goal-africa",
    name: "Goal.com Africa",
    url: "https://www.goal.com/feeds/en-ng/news",
    category: "Sports",
    icon: "⚽",
    region: "AFRICA",
  },
  {
    id: "legit-ng",
    name: "Legit.ng",
    url: "https://www.legit.ng/rss/all.rss",
    category: "General",
    icon: "📰",
    region: "NG",
  },
];

/**
 * Fetch trending topics from RSS feeds
 * Can be called manually from admin dashboard
 */
exports.fetchTrendingTopics = onCall(async (request) => {
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
        "Only admins can fetch trending topics",
    );
  }

  try {
    // Get custom sources from Firestore or use defaults
    let sources = DEFAULT_NEWS_SOURCES;
    const sourcesSnapshot = await db.collection("news_sources")
        .where("isActive", "==", true)
        .get();

    if (!sourcesSnapshot.empty) {
      sources = sourcesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    }

    const allTopics = [];
    const fetchErrors = [];

    // Fetch from each source
    for (const source of sources) {
      try {
        logger.info(`Fetching from ${source.name}: ${source.url}`);
        const feed = await rssParser.parseURL(source.url);

        // Process items (limit to 10 per source)
        const items = (feed.items || []).slice(0, 10);

        for (const item of items) {
          // Extract image from RSS item
          const imageUrl = extractImageFromRSSItem(item);
          
          const topic = {
            headline: item.title || "No title",
            summary: item.contentSnippet || item.content || "",
            source: source.name,
            sourceId: source.id,
            sourceUrl: item.link || "",
            sourceIcon: source.icon || "📰",
            category: source.category || "General",
            region: source.region || "NG",
            imageUrl: imageUrl || null,
            publishedAt: item.pubDate ?
              admin.firestore.Timestamp.fromDate(new Date(item.pubDate)) :
              admin.firestore.Timestamp.now(),
            fetchedAt: admin.firestore.Timestamp.now(),
            dismissed: false,
            usedForPrediction: false,
            relevanceScore: calculateRelevanceScore(item, source),
            isPredictionWorthy: isPredictionWorthy(item),
            keywords: extractKeywords(item.title || ""),
          };

          allTopics.push(topic);
        }

        // Update source last fetched time
        if (source.id && sourcesSnapshot.docs.find((d) => d.id === source.id)) {
          await db.collection("news_sources").doc(source.id).update({
            lastFetched: admin.firestore.Timestamp.now(),
            articlesCount: admin.firestore.FieldValue.increment(items.length),
          });
        }
      } catch (error) {
        logger.error(`Error fetching from ${source.name}:`, error.message);
        fetchErrors.push({source: source.name, error: error.message});
      }
    }

    // Save topics to Firestore (avoid duplicates by checking sourceUrl)
    const batch = db.batch();
    let savedCount = 0;

    for (const topic of allTopics) {
      // Check if topic already exists
      const existingQuery = await db.collection("trending_topics")
          .where("sourceUrl", "==", topic.sourceUrl)
          .limit(1)
          .get();

      if (existingQuery.empty) {
        const topicRef = db.collection("trending_topics").doc();
        batch.set(topicRef, topic);
        savedCount++;
      }
    }

    await batch.commit();

    // Clean up old topics (older than 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const oldTopicsQuery = await db.collection("trending_topics")
        .where("fetchedAt", "<", admin.firestore.Timestamp.fromDate(sevenDaysAgo))
        .get();

    const deleteBatch = db.batch();
    oldTopicsQuery.forEach((doc) => {
      deleteBatch.delete(doc.ref);
    });
    await deleteBatch.commit();

    logger.info(`Saved ${savedCount} new topics, deleted ${oldTopicsQuery.size} old topics`);

    return {
      success: true,
      message: `Fetched ${allTopics.length} topics, saved ${savedCount} new ones`,
      totalFetched: allTopics.length,
      newSaved: savedCount,
      errors: fetchErrors,
    };
  } catch (error) {
    logger.error("Error fetching trending topics:", error);
    throw new HttpsError("internal", "Failed to fetch trending topics");
  }
});

/**
 * Get trending topics for admin dashboard
 */
exports.getTrendingTopics = onCall(async (request) => {
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
        "Only admins can view trending topics",
    );
  }

  const {category, limit: topicLimit = 20, includeDismissed = false} = data || {};

  try {
    let query = db.collection("trending_topics")
        .orderBy("fetchedAt", "desc");

    if (!includeDismissed) {
      query = query.where("dismissed", "==", false);
    }

    if (category && category !== "all") {
      query = query.where("category", "==", category);
    }

    const snapshot = await query.limit(topicLimit).get();

    const topics = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      fetchedAt: doc.data().fetchedAt?.toDate?.() || new Date(),
      publishedAt: doc.data().publishedAt?.toDate?.() || new Date(),
    }));

    return {
      success: true,
      topics,
      count: topics.length,
    };
  } catch (error) {
    logger.error("Error getting trending topics:", error);
    throw new HttpsError("internal", "Failed to get trending topics");
  }
});

/**
 * Dismiss a trending topic
 */
exports.dismissTrendingTopic = onCall(async (request) => {
  const {auth, data} = request;

  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const userDoc = await db.collection("users").doc(auth.uid).get();
  if (!userDoc.exists || userDoc.data().role !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can dismiss topics");
  }

  const {topicId} = data;

  if (!topicId) {
    throw new HttpsError("invalid-argument", "Topic ID is required");
  }

  try {
    await db.collection("trending_topics").doc(topicId).update({
      dismissed: true,
      dismissedAt: admin.firestore.Timestamp.now(),
      dismissedBy: auth.uid,
    });

    return {success: true, message: "Topic dismissed"};
  } catch (error) {
    logger.error("Error dismissing topic:", error);
    throw new HttpsError("internal", "Failed to dismiss topic");
  }
});

/**
 * Mark topic as used for prediction
 */
exports.markTopicAsUsed = onCall(async (request) => {
  const {auth, data} = request;

  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const userDoc = await db.collection("users").doc(auth.uid).get();
  if (!userDoc.exists || userDoc.data().role !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can update topics");
  }

  const {topicId, predictionId} = data;

  if (!topicId) {
    throw new HttpsError("invalid-argument", "Topic ID is required");
  }

  try {
    await db.collection("trending_topics").doc(topicId).update({
      usedForPrediction: true,
      predictionId: predictionId || null,
      usedAt: admin.firestore.Timestamp.now(),
    });

    return {success: true, message: "Topic marked as used"};
  } catch (error) {
    logger.error("Error updating topic:", error);
    throw new HttpsError("internal", "Failed to update topic");
  }
});

/**
 * Get or initialize news sources
 */
exports.getNewsSources = onCall(async (request) => {
  const {auth} = request;

  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const userDoc = await db.collection("users").doc(auth.uid).get();
  if (!userDoc.exists || userDoc.data().role !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can view sources");
  }

  try {
    const snapshot = await db.collection("news_sources").get();

    // If no sources exist, initialize with defaults
    if (snapshot.empty) {
      const batch = db.batch();
      for (const source of DEFAULT_NEWS_SOURCES) {
        const ref = db.collection("news_sources").doc(source.id);
        batch.set(ref, {
          ...source,
          isActive: true,
          createdAt: admin.firestore.Timestamp.now(),
          lastFetched: null,
          articlesCount: 0,
          predictionsMade: 0,
        });
      }
      await batch.commit();

      return {
        success: true,
        sources: DEFAULT_NEWS_SOURCES.map((s) => ({...s, isActive: true})),
        initialized: true,
      };
    }

    const sources = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      success: true,
      sources,
      initialized: false,
    };
  } catch (error) {
    logger.error("Error getting news sources:", error);
    throw new HttpsError("internal", "Failed to get news sources");
  }
});

/**
 * Toggle news source active status
 */
exports.toggleNewsSource = onCall(async (request) => {
  const {auth, data} = request;

  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const userDoc = await db.collection("users").doc(auth.uid).get();
  if (!userDoc.exists || userDoc.data().role !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can update sources");
  }

  const {sourceId, isActive} = data;

  if (!sourceId || typeof isActive !== "boolean") {
    throw new HttpsError("invalid-argument", "Source ID and isActive required");
  }

  try {
    await db.collection("news_sources").doc(sourceId).update({
      isActive,
      updatedAt: admin.firestore.Timestamp.now(),
    });

    return {success: true, message: `Source ${isActive ? "enabled" : "disabled"}`};
  } catch (error) {
    logger.error("Error toggling source:", error);
    throw new HttpsError("internal", "Failed to toggle source");
  }
});

// Helper functions for relevance scoring

/**
 * Calculate relevance score for a news item
 */
function calculateRelevanceScore(item, source) {
  let score = 50; // Base score

  // Boost for recency
  if (item.pubDate) {
    const pubDate = new Date(item.pubDate);
    const hoursAgo = (Date.now() - pubDate.getTime()) / (1000 * 60 * 60);
    if (hoursAgo < 6) score += 30;
    else if (hoursAgo < 24) score += 20;
    else if (hoursAgo < 48) score += 10;
  }

  // Boost for certain keywords indicating events
  const title = (item.title || "").toLowerCase();
  const eventKeywords = [
    "match", "game", "election", "vote", "winner",
    "final", "semi-final", "quarter-final", "cup",
    "announce", "release", "launch", "premiere",
    "vs", "versus", "against", "champion",
  ];

  for (const keyword of eventKeywords) {
    if (title.includes(keyword)) {
      score += 5;
    }
  }

  // Boost for sports category (usually clear outcomes)
  if (source.category === "Sports") {
    score += 10;
  }

  return Math.min(100, score);
}

/**
 * Determine if news item is suitable for prediction
 */
function isPredictionWorthy(item) {
  const title = (item.title || "").toLowerCase();

  // Keywords that indicate future events
  const futureIndicators = [
    "will", "to face", "vs", "versus", "upcoming", "set to",
    "expected", "scheduled", "announces", "to release",
    "match", "game", "election", "vote", "final",
  ];

  // Keywords that indicate past events (less suitable)
  const pastIndicators = [
    "won", "lost", "defeated", "beats", "crashed",
    "died", "passed away", "sentenced", "arrested",
  ];

  let futureScore = 0;
  let pastScore = 0;

  for (const indicator of futureIndicators) {
    if (title.includes(indicator)) futureScore++;
  }

  for (const indicator of pastIndicators) {
    if (title.includes(indicator)) pastScore++;
  }

  return futureScore > pastScore;
}

/**
 * Extract keywords from title
 */
function extractKeywords(title) {
  const stopWords = [
    "the", "a", "an", "is", "are", "was", "were", "be", "been",
    "being", "have", "has", "had", "do", "does", "did", "will",
    "would", "could", "should", "may", "might", "must", "shall",
    "to", "of", "in", "for", "on", "with", "at", "by", "from",
    "as", "into", "through", "during", "before", "after", "above",
    "below", "between", "under", "again", "further", "then", "once",
    "and", "but", "or", "nor", "so", "yet", "both", "either", "neither",
    "not", "only", "own", "same", "than", "too", "very", "just",
  ];

  const words = title.toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.includes(word));

  return [...new Set(words)].slice(0, 10);
}

/*
 * DEPRECATED: Unsplash Source is no longer available
 * Images are now extracted from RSS feeds automatically
 */
/* exports.searchImage = onCall(async (request) => {
  const {auth, data} = request;

  // Check authentication
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {query, category} = data;

  if (!query) {
    throw new HttpsError("invalid-argument", "Query is required");
  }

  try {
    // Try Unsplash API first (free tier: 50 requests/hour)
    // You can get a free API key at https://unsplash.com/developers
    const unsplashAccessKey = process.env.UNSPLASH_ACCESS_KEY;
    
    if (unsplashAccessKey) {
      const fetch = (await import("node-fetch")).default;
      const searchUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`;
      
      const response = await fetch(searchUrl, {
        headers: {
          "Authorization": `Client-ID ${unsplashAccessKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          // Return the first few results
          const images = data.results.map((img) => ({
            id: img.id,
            url: img.urls.regular,
            thumbUrl: img.urls.thumb,
            description: img.description || img.alt_description,
            credit: `Photo by ${img.user.name} on Unsplash`,
            creditUrl: img.user.links.html,
          }));

          return {
            success: true,
            source: "unsplash",
            images,
          };
        }
      }
    }

    // Fallback: Return category-based placeholder images from Unsplash Source (no API key needed)
    const categoryImages = {
      "Politics": "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&h=450&fit=crop",
      "Sports": "https://images.unsplash.com/photo-1461896836934- voices-a8b0e06e40a2?w=800&h=450&fit=crop",
      "Entertainment": "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=450&fit=crop",
      "Technology": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=450&fit=crop",
      "Business": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=450&fit=crop",
      "General": "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=450&fit=crop",
    };

    // Use Unsplash Source for dynamic images (no API key, but less control)
    const searchTerms = query.split(" ").slice(0, 3).join(",");
    const dynamicUrl = `https://source.unsplash.com/800x450/?${encodeURIComponent(searchTerms)}`;

    return {
      success: true,
      source: "unsplash-source",
      images: [
        {
          id: "dynamic",
          url: dynamicUrl,
          thumbUrl: dynamicUrl,
          description: `Image for: ${query}`,
          credit: "Photo from Unsplash",
          creditUrl: "https://unsplash.com",
        },
        {
          id: "category-fallback",
          url: categoryImages[category] || categoryImages["General"],
          thumbUrl: categoryImages[category] || categoryImages["General"],
          description: `${category} category image`,
          credit: "Photo from Unsplash",
          creditUrl: "https://unsplash.com",
        },
      ],
    };
  } catch (error) {
    logger.error("Error searching for images:", error);
    throw new HttpsError("internal", "Failed to search for images");
  }
}); */
