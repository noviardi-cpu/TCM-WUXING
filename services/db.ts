
import { UserAccount, SavedPatient, AppSettings } from '../types';
import { db as firestore, auth } from '../firebase';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where } from 'firebase/firestore';

export const DEFAULT_ADMIN: UserAccount = {
  uid: 'admin-init',
  username: 'admin',
  password: 'admin123', 
  role: 'SUPER_SAINT',
  createdAt: Date.now()
};

export const db = {
  settings: {
    get: async (): Promise<AppSettings | null> => {
      const local = localStorage.getItem('tcm_app_settings');
      const localData = local ? JSON.parse(local) : null;

      if (!auth.currentUser) {
        if (localData && !localData.geminiApiKeys) {
          localData.geminiApiKeys = [];
        }
        return localData;
      }

      try {
        const docRef = doc(firestore, 'settings', 'global');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as AppSettings;
          const mergedData = {
            ...data,
            geminiApiKeys: data.geminiApiKeys || []
          };
          localStorage.setItem('tcm_app_settings', JSON.stringify(mergedData));
          return mergedData;
        }
        
        if (localData && !localData.geminiApiKeys) {
          localData.geminiApiKeys = [];
        }
        return localData;
      } catch (e) {
        console.error('Firebase Error (settings.get):', e);
        if (localData && !localData.geminiApiKeys) {
          localData.geminiApiKeys = [];
        }
        return localData;
      }
    },
    update: async (settings: AppSettings): Promise<{ success: boolean; error?: string }> => {
      try {
        const settingsString = JSON.stringify(settings);
        localStorage.setItem('tcm_app_settings', settingsString);

        if (!auth.currentUser) {
          return { success: true };
        }

        const payload = { 
          geminiApiKey: settings.geminiApiKey || '',
          geminiApiKeys: settings.geminiApiKeys || [],
          clinicName: settings.clinicName || '',
          clinicAddress: settings.clinicAddress || '',
          clinicPhone: settings.clinicPhone || ''
        };

        await setDoc(doc(firestore, 'settings', 'global'), payload, { merge: true });
        return { success: true };
      } catch (e: any) {
        console.error('Firebase Error in settings.update', e);
        return { success: false, error: e.message || "An unexpected error occurred while saving." };
      }
    }
  },
  users: {
    getAll: async (): Promise<UserAccount[]> => {
      const local = localStorage.getItem('tcm_users');
      if (local) {
        try {
          return JSON.parse(local);
        } catch (e) {
          console.error('Error parsing local users', e);
        }
      }
      return [DEFAULT_ADMIN];
    },
    add: async (user: UserAccount): Promise<boolean> => {
      try {
        const users = await db.users.getAll();
        const existingIndex = users.findIndex(u => u.username === user.username);
        if (existingIndex >= 0) {
          users[existingIndex] = user;
        } else {
          users.push(user);
        }
        localStorage.setItem('tcm_users', JSON.stringify(users));

        if (auth.currentUser) {
          await setDoc(doc(firestore, 'users', user.uid), user);
        }
        return true;
      } catch (e) {
        console.error('Error (users.add):', e);
        return false;
      }
    },
    register: async (user: Omit<UserAccount, 'uid' | 'createdAt' | 'role'>): Promise<boolean> => {
      try {
        const users = await db.users.getAll();
        if (users.some(u => u.username === user.username)) {
          return false;
        }
        const newUser: UserAccount = {
          uid: Date.now().toString(),
          username: user.username,
          password: user.password,
          role: 'REGULAR',
          createdAt: Date.now()
        };
        users.push(newUser);
        localStorage.setItem('tcm_users', JSON.stringify(users));
        
        if (auth.currentUser) {
          await setDoc(doc(firestore, 'users', newUser.uid), newUser);
        }
        return true;
      } catch (e) {
        console.error('Error (users.register):', e);
        return false;
      }
    },
    delete: async (uid: string): Promise<boolean> => {
      try {
        const users = await db.users.getAll();
        const filtered = users.filter(u => u.uid !== uid && u.username !== uid);
        localStorage.setItem('tcm_users', JSON.stringify(filtered));

        if (auth.currentUser) {
          await deleteDoc(doc(firestore, 'users', uid));
        }
        return true;
      } catch (e) {
        console.error('Error (users.delete):', e);
        return false;
      }
    }
  },
  patients: {
    getAll: async (): Promise<SavedPatient[]> => {
      if (!auth.currentUser) return [];
      try {
        const q = query(collection(firestore, 'patients'), where('authorUid', '==', auth.currentUser.uid));
        const querySnapshot = await getDocs(q);
        const patients: SavedPatient[] = [];
        querySnapshot.forEach((doc) => {
          patients.push(doc.data() as SavedPatient);
        });
        return patients;
      } catch (e) {
        console.error('Firebase Error (patients.getAll):', e);
        return [];
      }
    },
    add: async (patient: SavedPatient) => {
      if (!auth.currentUser) return;
      try {
        const patientWithAuth = { ...patient, authorUid: auth.currentUser.uid };
        await setDoc(doc(firestore, 'patients', patient.id), patientWithAuth);
      } catch (e) {
        console.error('Firebase Error (patients.add):', e);
      }
    },
    delete: async (id: string) => {
      if (!auth.currentUser) return;
      try {
        await deleteDoc(doc(firestore, 'patients', id));
      } catch (e) {
        console.error('Firebase Error (patients.delete):', e);
      }
    }
  }
};

