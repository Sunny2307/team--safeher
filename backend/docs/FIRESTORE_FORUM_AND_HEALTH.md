# Firestore Collections & Indexes: Forum & Health Module

This document defines the Firestore collections, document shapes, and required indexes for the Women's Health Community & Support module. All writes go through the backend; the app does not write directly to these collections from the client.

---

## Collections

### forum_posts

Stores anonymous health forum posts.

| Field          | Type    | Description                                      |
|----------------|---------|--------------------------------------------------|
| userId         | string  | Owner (phoneNumber); server-only, never exposed  |
| anonymousName  | string  | Display alias, e.g. "User_4821"                  |
| title          | string  | Post title                                       |
| content        | string  | Post body                                        |
| category       | string  | One of: PCOS, periods, fertility, mental_health, safety, other |
| likesCount     | number  | Number of likes                                  |
| commentsCount  | number  | Number of comments                               |
| reportsCount   | number  | Number of reports                                |
| createdAt      | timestamp | Server timestamp                               |
| isReported     | boolean | True when post has been reported                 |
| isHidden       | boolean | True when hidden (auto or admin); excluded from public list |

**Indexes:** See `firestore.indexes.json` for composite indexes on `isHidden`, `category`, `createdAt`.

---

### forum_comments

Stores comments on forum posts.

| Field         | Type      | Description                    |
|---------------|-----------|--------------------------------|
| postId        | string    | forum_posts document ID       |
| userId        | string    | Commenter (server-only)       |
| anonymousName | string    | Display alias                  |
| comment       | string    | Comment text                   |
| createdAt     | timestamp | Server timestamp              |

**Indexes:** Composite on `postId` + `createdAt` for paginated comment lists.

---

### forum_reports

Stores user reports on posts (for moderation).

| Field     | Type      | Description           |
|-----------|-----------|-----------------------|
| postId    | string    | forum_posts document ID |
| reportedBy| string    | Reporter userId       |
| reason    | string    | Report reason         |
| createdAt | timestamp | Server timestamp      |

No composite indexes required for current queries (admin fetches by postId).

---

### forum_profiles

One document per user: stable anonymous display name for the forum.

| Field         | Type      | Description                |
|---------------|-----------|----------------------------|
| userId        | string    | Same as document ID        |
| anonymousName| string    | e.g. "User_4821"           |
| createdAt     | timestamp | First forum activity       |

Document ID = `userId` (phoneNumber).

---

### forum_user_meta

Per-user activity for rate limiting and optional bans.

| Field        | Type      | Description                          |
|--------------|-----------|--------------------------------------|
| lastPostAt   | timestamp | Last post time                       |
| lastCommentAt| timestamp | Last comment time                    |
| postCountHour| number    | Posts in current hour (or reset window) |
| commentCountHour | number | Comments in current hour             |
| isBanned     | boolean   | If true, user cannot post/comment    |
| updatedAt    | timestamp | Last update                          |

Document ID = `userId`.

---

### forum_post_likes

Tracks which user liked which post (for toggle like). Prevents duplicate likes.

| Field   | Type    | Description           |
|---------|---------|-----------------------|
| postId  | string  | forum_posts document ID |
| userId  | string  | Liker (phoneNumber)    |
| createdAt| timestamp | When liked          |

**Query:** By `postId` to check if current user liked; document ID can be `postId_userId` for easy lookup.

---

### pcos_resources

Curated PCOS/PCOD educational content (admin-managed).

| Field    | Type      | Description                                  |
|----------|-----------|----------------------------------------------|
| title    | string    | Resource title                               |
| content  | string    | Full text or HTML                            |
| type     | string    | One of: diet, exercise, lifestyle, medical   |
| createdAt| timestamp | When created                                 |

**Indexes:** Composite on `type` + `createdAt` for filtered, ordered lists.

---

## Required Composite Indexes

Add these in Firebase Console or via `firestore.indexes.json` (see project root / frontend):

1. **forum_posts** – list posts (non-hidden, optional category), newest first:
   - Collection: `forum_posts`
   - Fields: `isHidden` (Asc), `createdAt` (Desc)
   - Query: `where('isHidden', '==', false).orderBy('createdAt', 'desc')`

2. **forum_posts** – same with category filter:
   - Collection: `forum_posts`
   - Fields: `isHidden` (Asc), `category` (Asc), `createdAt` (Desc)
   - Query: `where('isHidden', '==', false).where('category', '==', category).orderBy('createdAt', 'desc')`

3. **forum_comments** – list comments by post, oldest or newest first:
   - Collection: `forum_comments`
   - Fields: `postId` (Asc), `createdAt` (Asc) or (Desc)
   - Query: `where('postId', '==', postId).orderBy('createdAt', 'asc')`

4. **pcos_resources** – list by type, newest first:
   - Collection: `pcos_resources`
   - Fields: `type` (Asc), `createdAt` (Desc)
   - Query: `where('type', '==', type).orderBy('createdAt', 'desc')`

5. **pcos_resources** – list all, newest first:
   - Collection: `pcos_resources`
   - Fields: `createdAt` (Desc)

---

## Security (Backend Enforcement)

- All forum and PCOS writes and sensitive reads go through the Node backend. The mobile app must not use the Firestore client SDK for these collections.
- Firestore security rules deny client read/write on `forum_*` and `pcos_resources`; only the backend (Firebase Admin SDK) can access them.
- JWT identifies the user; role is used for admin-only routes. Admin routes require `Authorization: Bearer <token>` with `decoded.role === 'admin'`.
- Client-facing API responses must never include `userId`, phone, or email for forum posts/comments; only `anonymousName` and non-identifying fields.
- Rate limiting and content moderation are enforced in forum routes; banned users are stored in `forum_user_meta.isBanned`.
