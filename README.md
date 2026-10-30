# Rexaura Rentals — React + Firebase

A responsive luxury car-rental website for Port Harcourt and Lagos.

## Included
- Home, Fleet, About, Services, Contact and Book Now pages
- Responsive desktop, tablet and mobile navigation
- Light/dark theme saved in the browser
- Fleet category filters
- Firebase email/password registration and login
- Password reset
- Customer profile details
- Booking requests stored in Cloud Firestore
- Contact enquiries stored in Cloud Firestore
- Customer booking history
- Admin dashboard with booking status management
- Firestore security rules
- Netlify deployment configuration

## 1. Create and configure Firebase
1. Open https://console.firebase.google.com/ and create a Firebase project.
2. In Project settings, add a Web App and copy its Firebase configuration.
3. In Authentication > Sign-in method, enable **Email/Password**.
4. In Firestore Database, create a database (start in production mode).
5. Open Firestore Rules and publish the contents of `firestore.rules` from this project.
6. In Project settings > General > Your apps, find the Web App configuration.

## 2. Configure environment variables
Create a file named `.env` in the project root (same level as `package.json`) and copy the values from `.env.example`, replacing the placeholders with your Firebase Web App values.

Do not put service-account private keys or other server secrets in this frontend project. Firebase Web API config is intended for client initialization; Firestore rules protect the data.

## 3. Run and build
```bash
npm install
npm run dev
npm run build
```

## 4. Create an admin account
1. Register your own account through the website.
2. In Firebase Console > Firestore Database, open the `users` collection.
3. Open the document whose ID is your Firebase Authentication UID.
4. Change its `role` field from `customer` to `admin`.
5. Save. Sign out and sign in again; the Admin link/dashboard will be available.

Only do this manually in the Firebase Console for accounts you control. The app does not allow users to promote themselves.

## 5. Deploy to Netlify
1. Upload this project to a GitHub repository.
2. Import that repository in Netlify.
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add every `VITE_FIREBASE_...` variable from `.env` in Netlify Site configuration > Environment variables.
6. Trigger a new deploy after adding the variables.

The included `netlify.toml` configures the build and SPA redirect.

## Contact
- Email: rexgroups.uk@gmail.com
- Phone: +234 803 356 4331

## Notes
- Vehicle prices shown are sample starting prices and must be confirmed with the business before a booking is accepted.
- Booking submissions create **pending requests**, not confirmed reservations. Contact the customer to confirm vehicle availability, terms and final price.
- This project does not collect or process card payments.
- The contact form stores messages in Firestore; it does not send email notifications automatically.
- Add Firebase App Check and configure authorized domains in Firebase Authentication before public launch.
- Do not share Firebase admin credentials or give admin role to customers.
