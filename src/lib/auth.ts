import { User } from 'firebase/auth';
import { auth, googleProvider, signInWithPopup } from './firebase-config';

export const signInWithGoogle = async (): Promise<User | null> => {
  try {
    console.log("Google-ით ავტორიზაცია დაიწყო...");
    const result = await signInWithPopup(auth, googleProvider);
    console.log("Google-ით ავტორიზაცია წარმატებულია:", result.user.displayName);
    return result.user;
  } catch (error: any) {
    console.error("Google-ით ავტორიზაციის შეცდომა:", error);
    console.error("შეცდომის კოდი:", error.code);
    console.error("შეცდომის მესიჯი:", error.message);
    
    if (error.email) {
      console.error("ელ-ფოსტა:", error.email);
    }
    
    if (error.credential) {
      console.error("მანდატი:", error.credential);
    }
    
    // შეცდომის დეტალური ინფორმაცია
    if (error.customData) {
      console.error("დამატებითი მონაცემები:", error.customData);
    }
    
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