// src/lib/firebase/auth.ts
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  User
} from 'firebase/auth';
import { doc, setDoc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from './config';

export async function signUp(email: string, password: string, displayName: string) {
  try {
    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update profile with display name
    await updateProfile(user, { displayName });
    
    // Send verification email
    await sendEmailVerification(user);
    
    // Create user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      displayName: displayName,
      photoURL: '',
      authProvider: 'email',
      bio: '',
      points: 0,
      totalPoints: 0,
      totalVotes: 0,
      totalPredictions: 0,
      correctPredictions: 0,
      correctVotes: 0,
      accuracyRate: 0,
      role: 'user',
      isVerified: false,
      canCreatePolls: false,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      lastActive: serverTimestamp(),
      country: '',
      followersCount: 0,
      followingCount: 0,
      badges: [],
      streak: 0,
      level: 1,
      rank: 'novice',
      rankPercentage: 0
    });
    
    return user;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to sign up');
  }
}

export async function signIn(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Update last active timestamp
    await updateDoc(doc(db, 'users', userCredential.user.uid), {
      lastActive: serverTimestamp()
    });
    
    return userCredential.user;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to sign in');
  }
}

export async function signOut() {
  try {
    await firebaseSignOut(auth);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to sign out');
  }
}

export async function resetPassword(email: string) {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to send password reset email');
  }
}

export async function signInWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;
    
    // Check if user profile exists in Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (!userDoc.exists()) {
      // Create user profile for new Google sign-in
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        displayName: user.displayName || 'Anonymous',
        photoURL: user.photoURL || '',
        authProvider: 'google',
        bio: '',
        points: 0,
        totalPoints: 0,
        totalVotes: 0,
        totalPredictions: 0,
        correctPredictions: 0,
        correctVotes: 0,
        accuracyRate: 0,
        role: 'user',
        isVerified: true,
        canCreatePolls: false,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        lastActive: serverTimestamp(),
        followersCount: 0,
        followingCount: 0,
        badges: [],
        streak: 0,
        level: 1,
        rank: 'novice',
        rankPercentage: 0
      });
    } else {
      // Update last login and last active
      await updateDoc(doc(db, 'users', user.uid), {
        lastLoginAt: serverTimestamp(),
        lastActive: serverTimestamp()
      });
    }
    
    return user;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to sign in with Google');
  }
}

export async function signInWithApple() {
  try {
    const provider = new OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;
    
    // Check if user profile exists in Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (!userDoc.exists()) {
      // Create user profile for new Apple sign-in
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        displayName: user.displayName || 'Apple User',
        photoURL: user.photoURL || '',
        authProvider: 'apple',
        bio: '',
        points: 0,
        totalPoints: 0,
        totalVotes: 0,
        totalPredictions: 0,
        correctPredictions: 0,
        correctVotes: 0,
        accuracyRate: 0,
        role: 'user',
        isVerified: true,
        canCreatePolls: false,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        lastActive: serverTimestamp(),
        followersCount: 0,
        followingCount: 0,
        badges: [],
        streak: 0,
        level: 1,
        rank: 'novice',
        rankPercentage: 0
      });
    } else {
      // Update last login and last active
      await updateDoc(doc(db, 'users', user.uid), {
        lastLoginAt: serverTimestamp(),
        lastActive: serverTimestamp()
      });
    }
    
    return user;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to sign in with Apple');
  }
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}
