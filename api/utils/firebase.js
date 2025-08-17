const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  query,
  orderBy,
  where,
  serverTimestamp 
} = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Firestore collections
const COLLECTIONS = {
  REGISTRATIONS: 'registrations',
  ADMIN_USERS: 'admin_users'
};

// Helper functions
async function addDocument(collectionName, data) {
    try {
        console.log(`📝 Adding document to ${collectionName}:`, data);
        const docRef = await addDoc(collection(db, collectionName), {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        console.log(`✅ Document added with ID: ${docRef.id}`);
        return docRef;
    } catch (error) {
        console.error(`❌ Error adding document to ${collectionName}:`, error);
        throw error;
    }
}

async function getCollection(collectionName, orderByField = null, orderDirection = 'desc') {
    try {
        console.log(`📊 Getting collection: ${collectionName}`);
        let q = collection(db, collectionName);
        
        if (orderByField) {
            q = query(q, orderBy(orderByField, orderDirection));
        }
        
        const snapshot = await getDocs(q);
        const documents = [];
        
        snapshot.forEach((doc) => {
            documents.push({
                id: doc.id,
                ...doc.data()
            });
        });
      
        console.log(`✅ Retrieved ${documents.length} documents from ${collectionName}`);
        return documents;
    } catch (error) {
        console.error(`❌ Error getting collection ${collectionName}:`, error);
        throw error;
    }
}

async function getDocument(collectionName, docId) {
    try {
        console.log(`📄 Getting document: ${collectionName}/${docId}`);
        const docRef = doc(db, collectionName, docId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            console.log(`✅ Document retrieved: ${docId}`);
            return {
                id: docSnap.id,
                ...docSnap.data()
            };
        } else {
            console.log(`⚠️ Document not found: ${docId}`);
            return null;
        }
    } catch (error) {
        console.error(`❌ Error getting document ${docId}:`, error);
        throw error;
    }
}

async function updateDocument(collectionName, docId, data) {
    try {
        console.log(`✏️ Updating document: ${collectionName}/${docId}`, data);
        const docRef = doc(db, collectionName, docId);
        await updateDoc(docRef, {
            ...data,
            updatedAt: serverTimestamp()
        });
        console.log(`✅ Document updated: ${docId}`);
        return { id: docId };
    } catch (error) {
        console.error(`❌ Error updating document ${docId}:`, error);
        throw error;
    }
}

async function deleteDocument(collectionName, docId) {
    try {
        console.log(`🗑️ Deleting document: ${collectionName}/${docId}`);
        const docRef = doc(db, collectionName, docId);
        await deleteDoc(docRef);
        console.log(`✅ Document deleted: ${docId}`);
        return { id: docId };
    } catch (error) {
        console.error(`❌ Error deleting document ${docId}:`, error);
        throw error;
    }
}

// Statistics helpers
async function getRegistrationStats() {
    try {
        console.log('📊 Getting registration statistics');
        
        const registrations = await getCollection(COLLECTIONS.REGISTRATIONS, 'submittedAt', 'desc');
        
        const stats = {
            total: registrations.length,
            committeeStats: {
                'UNSC': 0,
                'UNODC': 0,
                'LOK SABHA': 0,
                'CCC': 0,
                'IPC': 0,
                'DISEC': 0
            },
            positionStats: {
                'Chairperson': 0,
                'Vice-Chairperson': 0,
                'Director': 0
            },
            yearStats: {
                '1': 0,
                '2': 0,
                '3': 0,
                '4': 0,
                '5': 0
            },
            recentSubmissions: registrations.slice(0, 10) // Last 10 submissions
        };
        
        // Calculate statistics from actual data
        registrations.forEach(reg => {
            // Committee stats
            if (reg.committees) {
                const committees = Array.isArray(reg.committees) ? reg.committees : JSON.parse(reg.committees || '[]');
                committees.forEach(committee => {
                    if (stats.committeeStats[committee] !== undefined) {
                        stats.committeeStats[committee]++;
                    }
                });
            }
            
            // Position stats
            if (reg.positions) {
                const positions = Array.isArray(reg.positions) ? reg.positions : JSON.parse(reg.positions || '[]');
                positions.forEach(position => {
                    if (stats.positionStats[position] !== undefined) {
                        stats.positionStats[position]++;
                    }
                });
            }
            
            // Year stats
            if (reg.year && stats.yearStats[reg.year] !== undefined) {
                stats.yearStats[reg.year]++;
            }
        });
        
        console.log('✅ Statistics retrieved');
        return stats;
    } catch (error) {
        console.error('❌ Error getting statistics:', error);
        throw error;
    }
}

module.exports = {
    db,
    COLLECTIONS,
    addDocument,
    getCollection,
    getDocument,
    updateDocument,
    deleteDocument,
    getRegistrationStats
};