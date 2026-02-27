const { db, admin } = require('../firebase');

const COLLECTION_NAME = 'symptoms';

class SymptomService {
    /**
     * Log symptoms for a specific date (upsert)
     */
    async addOrUpdateSymptom(userId, data) {
        try {
            const { date, symptoms, mood, flow, painLevel, notes } = data;

            // Check if entry already exists for this date
            const snapshot = await db.collection(COLLECTION_NAME)
                .where('userId', '==', userId)
                .where('date', '==', date)
                .limit(1)
                .get();

            const symptomData = {
                userId,
                date,
                symptoms: symptoms || [],
                mood: mood || '',
                flow: flow || '',
                painLevel: painLevel || 0,
                notes: notes || '',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            if (!snapshot.empty) {
                const docId = snapshot.docs[0].id;
                await db.collection(COLLECTION_NAME).doc(docId).update(symptomData);
                return { id: docId, ...symptomData };
            } else {
                symptomData.createdAt = admin.firestore.FieldValue.serverTimestamp();
                const docRef = await db.collection(COLLECTION_NAME).add(symptomData);
                return { id: docRef.id, ...symptomData };
            }
        } catch (error) {
            console.error('Error saving symptom:', error);
            throw error;
        }
    }

    /**
     * Get symptoms for a specific date
     */
    async getSymptomByDate(userId, date) {
        try {
            const snapshot = await db.collection(COLLECTION_NAME)
                .where('userId', '==', userId)
                .where('date', '==', date)
                .limit(1)
                .get();

            if (snapshot.empty) return null;
            return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        } catch (error) {
            console.error('Error fetching symptom:', error);
            throw error;
        }
    }

    /**
     * Get all symptom history (no orderBy to avoid index requirement)
     */
    async getSymptomHistory(userId) {
        try {
            const snapshot = await db.collection(COLLECTION_NAME)
                .where('userId', '==', userId)
                .get();

            const symptoms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Sort in memory: most recent first
            symptoms.sort((a, b) => {
                return new Date(b.date) - new Date(a.date);
            });

            return symptoms;
        } catch (error) {
            console.error('Error fetching symptom history:', error);
            throw error;
        }
    }
}

module.exports = new SymptomService();
