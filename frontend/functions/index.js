const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { google } = require('googleapis');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const fs = require('fs');
const path = require('path');
const { getStorage } = require('firebase-admin/storage');

admin.initializeApp();
const db = admin.firestore();
const storage = getStorage();

const client = new SecretManagerServiceClient();

async function accessSecretVersion(name) {
  const [version] = await client.accessSecretVersion({ name });
  return JSON.parse(version.payload.data.toString());
}

exports.processVideoUpload = functions.firestore
  .document('videoUploads/{uploadId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const { userId, storagePath, phoneNumber } = data;

    try {
      await snap.ref.update({ status: 'processing' });

      const secretName = 'projects/safeher-6d06a/secrets/google-drive-credentials/versions/1';
      const credentials = await accessSecretVersion(secretName);

      const auth = new google.auth.OAuth2(
        credentials.web.client_id,
        credentials.web.client_secret,
        credentials.web.redirect_uris[0]
      );
      auth.setCredentials({ access_token: null });

      const bucket = storage.bucket();
      const localPath = `/tmp/${context.params.uploadId}.mp4`;
      await bucket.file(storagePath).download({ destination: localPath });

      const drive = google.drive({ version: 'v3', auth });
      const fileMetadata = {
        name: `video_${context.params.uploadId}.mp4`,
        parents: ['1u73FelZqWer0bu49YqKe9doXARGgtW-4'],
      };
      const media = {
        mimeType: 'video/mp4',
        body: fs.createReadStream(localPath),
      };

      const file = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id',
      });

      await drive.permissions.create({
        fileId: file.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      const shareableLink = `https://drive.google.com/file/d/${file.data.id}/view`;

      const message = encodeURIComponent(`Check out this video: ${shareableLink}`);
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

      await snap.ref.update({
        status: 'completed',
        shareableLink,
        whatsappUrl,
      });

      fs.unlinkSync(localPath);

      return null;
    } catch (error) {
      console.error('Error processing video upload:', error);
      await snap.ref.update({ status: 'failed', error: error.message });
      return null;
    }
  });