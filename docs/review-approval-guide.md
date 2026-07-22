# ProtectMyPhoto Review Approval Guide

ProtectMyPhoto reviews are stored in Firebase Firestore in the `reviews` collection.

## Review flow

1. A user submits a review from `reviews.html`.
2. The site saves the review with `status: pending`.
3. Pending reviews are not shown publicly.
4. An admin checks the review in Firebase.
5. If the review is genuine and safe, the admin changes `status` to `approved`.
6. The review appears on the public reviews page after refresh.

## How to approve a review

1. Open Firebase Console.
2. Go to Firestore Database.
3. Open the `reviews` collection.
4. Open the newest review document.
5. Check:
   - `rating` is between 1 and 5.
   - `reviewText` is genuine and not spam.
   - No abusive, fake, or unsafe content is present.
6. Edit the `status` field.
7. Change it from `pending` to `approved`.
8. Save the document.
9. Refresh `https://protectmyphoto.in/reviews.html`.

## When to reject a review

Do not approve reviews that include spam, abusive language, fake claims, private information, links, or unrelated promotional content.

For rejected reviews, keep `status: pending` or change it to `hidden` if you need to keep the record without showing it.

## Security note

Public users can only create pending reviews. The public site only reads reviews with `status: approved`.
