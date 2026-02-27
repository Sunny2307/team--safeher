const { db, admin } = require('../firebase');

const COLLECTION_NAME = 'cycles';

class CycleService {
    /**
     * Add a new cycle entry
     */
    async addCycle(userId, cycleData) {
        try {
            const { startDate, endDate, notes } = cycleData;

            let cycleLength = null;
            if (startDate && endDate) {
                const start = new Date(startDate);
                const end = new Date(endDate);
                const diffTime = Math.abs(end - start);
                cycleLength = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            }

            const newCycle = {
                userId,
                startDate,
                endDate: endDate || null,
                cycleLength,
                notes: notes || '',
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            };

            const docRef = await db.collection(COLLECTION_NAME).add(newCycle);
            return { id: docRef.id, ...newCycle };
        } catch (error) {
            console.error('Error adding cycle:', error);
            throw error;
        }
    }

    /**
     * Get cycle history for a user (no orderBy to avoid index requirement)
     */
    async getCycles(userId) {
        try {
            const snapshot = await db.collection(COLLECTION_NAME)
                .where('userId', '==', userId)
                .get();

            const cycles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Sort in memory: most recent first
            cycles.sort((a, b) => {
                const dateA = new Date(a.startDate);
                const dateB = new Date(b.startDate);
                return dateB - dateA;
            });

            return cycles;
        } catch (error) {
            console.error('Error fetching cycles:', error);
            throw error;
        }
    }

    /**
     * Update a cycle entry
     */
    async updateCycle(userId, cycleId, updateData) {
        try {
            const docRef = db.collection(COLLECTION_NAME).doc(cycleId);
            const doc = await docRef.get();

            if (!doc.exists) throw new Error('Cycle not found');
            if (doc.data().userId !== userId) throw new Error('Unauthorized');

            let { startDate, endDate } = { ...doc.data(), ...updateData };
            let cycleLength = doc.data().cycleLength;

            if (updateData.startDate || updateData.endDate) {
                if (startDate && endDate) {
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    const diffTime = Math.abs(end - start);
                    cycleLength = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                }
            }

            const updatedFields = {
                ...updateData,
                cycleLength,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            await docRef.update(updatedFields);
            return { id: cycleId, ...updatedFields };
        } catch (error) {
            console.error('Error updating cycle:', error);
            throw error;
        }
    }

    /**
     * Delete a cycle entry
     */
    async deleteCycle(userId, cycleId) {
        try {
            const docRef = db.collection(COLLECTION_NAME).doc(cycleId);
            const doc = await docRef.get();

            if (!doc.exists) throw new Error('Cycle not found');
            if (doc.data().userId !== userId) throw new Error('Unauthorized');

            await docRef.delete();
            return { success: true };
        } catch (error) {
            console.error('Error deleting cycle:', error);
            throw error;
        }
    }

    /**
     * Calculate predictions for next period and fertile window
     */
    async getPredictions(userId) {
        try {
            const cycles = await this.getCycles(userId);

            if (cycles.length === 0) return null;

            // Calculate average cycle length from start date differences
            let totalDays = 0;
            let count = 0;
            const recentCycles = cycles.slice(0, 4);

            for (let i = 0; i < recentCycles.length - 1; i++) {
                const currentStart = new Date(recentCycles[i].startDate);
                const prevStart = new Date(recentCycles[i + 1].startDate);
                const diffTime = Math.abs(currentStart - prevStart);
                const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                totalDays += days;
                count++;
            }

            const averageCycleLength = count > 0 ? Math.round(totalDays / count) : 28;

            // Predict Next Period
            const lastCycleStart = new Date(cycles[0].startDate);
            const nextPeriodDate = new Date(lastCycleStart);
            nextPeriodDate.setDate(lastCycleStart.getDate() + averageCycleLength);

            // Predict Ovulation (Next Period - 14 days)
            const ovulationDate = new Date(nextPeriodDate);
            ovulationDate.setDate(nextPeriodDate.getDate() - 14);

            // Fertile Window (Ovulation - 5 to Ovulation + 1)
            const fertileStart = new Date(ovulationDate);
            fertileStart.setDate(ovulationDate.getDate() - 5);
            const fertileEnd = new Date(ovulationDate);
            fertileEnd.setDate(ovulationDate.getDate() + 1);

            return {
                nextPeriodDate: nextPeriodDate.toISOString().split('T')[0],
                ovulationDate: ovulationDate.toISOString().split('T')[0],
                fertileWindow: {
                    start: fertileStart.toISOString().split('T')[0],
                    end: fertileEnd.toISOString().split('T')[0]
                },
                averageCycleLength
            };
        } catch (error) {
            console.error('Error calculating predictions:', error);
            throw error;
        }
    }
}

module.exports = new CycleService();
