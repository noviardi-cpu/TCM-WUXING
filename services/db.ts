
import { UserAccount, SavedPatient, AppSettings } from '../types';
import { db as firestore, auth } from '../firebase';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where } from 'firebase/firestore';
import { supabase } from '../supabase';

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
      const uid = auth.currentUser?.uid || 'local-guest';
      
      // 1. Try Supabase First
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('patients')
            .select('*');
            
          if (!error && data) {
            return data as SavedPatient[];
          } else {
            console.error('Supabase Error (patients.getAll):', error);
          }
        } catch (err) {
          console.error('Supabase Exception:', err);
        }
      }

      // 2. Fallback to Firebase
      try {
        const q = query(collection(firestore, 'patients'), where('authorUid', '==', uid));
        const querySnapshot = await getDocs(q);
        const patients: SavedPatient[] = [];
        querySnapshot.forEach((doc) => {
          patients.push(doc.data() as SavedPatient);
        });
        return patients;
      } catch (e) {
        console.error('Firebase Error (patients.getAll):', e);
        
        // 3. Fallback to local storage if both fail
        const localData = localStorage.getItem('tcm_patients_local');
        return localData ? JSON.parse(localData) : [];
      }
    },
    add: async (patient: SavedPatient) => {
      const uid = auth.currentUser?.uid || 'local-guest';
      const patientWithAuth = { ...patient, authorUid: uid };

      // 1. Try Supabase
      if (supabase) {
        try {
          // Flatten objects to make sure they can be inserted if columns aren't strict JSONs, 
          // but assuming Supabase column is JSONB, it will handle it natively.
          const { error } = await supabase
            .from('patients')
            .upsert(patientWithAuth);
            
          if (error) {
            console.error('Supabase Error (patients.add):', error);
          }
        } catch (err) {
          console.error('Supabase Exception (patients.add):', err);
        }
      }

      // 2. Try Firebase
      try {
        await setDoc(doc(firestore, 'patients', patient.id), patientWithAuth);
      } catch (e) {
        console.error('Firebase Error (patients.add):', e);
      }
      
      // 3. Always save locally as a reliable offline cache
      try {
         const localData = localStorage.getItem('tcm_patients_local');
         const patients: SavedPatient[] = localData ? JSON.parse(localData) : [];
         const newPatients = [...patients.filter(p => p.id !== patient.id), patientWithAuth];
         localStorage.setItem('tcm_patients_local', JSON.stringify(newPatients));
      } catch (err) {}
    },
    delete: async (id: string) => {
      // 1. Try Supabase
      if (supabase) {
        try {
          const { error } = await supabase
            .from('patients')
            .delete()
            .eq('id', id);
          if (error) {
            console.error('Supabase Error (patients.delete):', error);
          }
        } catch (err) {
          console.error('Supabase Exception:', err);
        }
      }

      // 2. Try Firebase
      try {
        await deleteDoc(doc(firestore, 'patients', id));
      } catch (e) {
        console.error('Firebase Error (patients.delete):', e);
      }
      
      // 3. Also delete locally
      try {
         const localData = localStorage.getItem('tcm_patients_local');
         if (localData) {
            const patients: SavedPatient[] = JSON.parse(localData);
            localStorage.setItem('tcm_patients_local', JSON.stringify(patients.filter(p => p.id !== id)));
         }
      } catch (err) {}
    }
  }
};

