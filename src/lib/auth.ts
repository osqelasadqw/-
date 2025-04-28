import { User } from 'firebase/auth';
import { auth, googleProvider, signInWithPopup } from './firebase-config';

export const signInWithGoogle = async (): Promise<User | null> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error("Google-ით ავტორიზაციის შეცდომა:", error.message);
    return null;
  }
};

export const signOut = async (): Promise<boolean> => {
  try {
    await auth.signOut();
    return true;
  } catch (error: any) {
    console.error("გასვლის შეცდომა:", error.message);
    return false;
  }
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser;
}; 