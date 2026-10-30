import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, sendPasswordResetEmail, updateProfile
} from "firebase/auth";
import {
  addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query,
  serverTimestamp, updateDoc, where
} from "firebase/firestore";
import {
  Crown, Menu, X, Sun, Moon, CarFront, MapPin, CalendarDays, ShieldCheck,
  Clock3, UserRound, Plane, ChevronRight, Check, Mail, Phone, Instagram,
  Facebook, ArrowRight, Gauge, Users, Star, LogOut, LayoutDashboard,
  ClipboardList, CircleUserRound, AlertCircle, RefreshCw
} from "lucide-react";
import { auth, db, firebaseReady } from "./firebase";
import "./styles.css";

const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || "rexgroups.uk@gmail.com";
const CONTACT_PHONE = import.meta.env.VITE_CONTACT_PHONE || "+2348033564331";
const phoneDisplay = "+234 803 356 4331";

const fleet = [
  { id: 1, name: "Mercedes-Benz G-Wagon", type: "Luxury SUV", seats: "4–5 Seats", price: "₦120,000", image: "https://images.unsplash.com/photo-1520031441872-265e4ff70366?auto=format&fit=crop&w=1000&q=85", detail: "Iconic design, commanding presence and a refined cabin." },
  { id: 2, name: "Range Rover Autobiography", type: "Luxury SUV", seats: "5–7 Seats", price: "₦110,000", image: "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1000&q=85", detail: "Comfort-focused luxury for business and long-distance travel." },
  { id: 3, name: "Lamborghini Huracán", type: "Exotic Supercar", seats: "2 Seats", price: "₦350,000", image: "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1000&q=85", detail: "An unforgettable performance experience for special occasions." },
  { id: 4, name: "Porsche 911", type: "Sports Car", seats: "2–4 Seats", price: "₦280,000", image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1000&q=85", detail: "Precision performance with unmistakable sports-car character." },
  { id: 5, name: "Toyota Land Cruiser", type: "Premium SUV", seats: "5–7 Seats", price: "₦95,000", image: "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1000&q=85", detail: "Dependable comfort and space for family and executive trips." },
  { id: 6, name: "Mercedes-Benz S-Class", type: "Executive Sedan", seats: "4–5 Seats", price: "₦160,000", image: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1000&q=85", detail: "Quiet, elegant executive travel with premium comfort." }
];
const pageNames = ["Home", "Fleet", "About", "Services", "Contact"];
const prettyError = (error) => {
  const code = error?.code || "";
  if (code.includes("email-already-in-use")) return "That email already has an account. Please sign in instead.";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) return "Email or password is incorrect.";
  if (code.includes("weak-password")) return "Please choose a password with at least 6 characters.";
  if (code.includes("network-request-failed")) return "Network error. Check your internet connection and try again.";
  if (code.includes("permission-denied")) return "Permission denied. Check that the Firestore security rules have been published.";
  return error?.message || "Something went wrong. Please try again.";
};

function App() {
  const [page, setPage] = useState("Home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("rexaura-theme") || "dark");
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [modal, setModal] = useState("");
  const [authMode, setAuthMode] = useState("signin");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState({ location: "Port Harcourt", type: "All vehicles", pickup: "", dropoff: "" });
  const [filter, setFilter] = useState("All vehicles");
  const [selectedCar, setSelectedCar] = useState(null);
  const [bookingBusy, setBookingBusy] = useState(false);
  const [contactBusy, setContactBusy] = useState(false);
  const [myBookings, setMyBookings] = useState([]);
  const [adminBookings, setAdminBookings] = useState([]);
  const [adminEnquiries, setAdminEnquiries] = useState([]);
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminError, setAdminError] = useState("");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("rexaura-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!firebaseReady) { setAuthLoading(false); return; }
    return onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setProfile(null);
      setMyBookings([]);
      if (currentUser) {
        try {
          const snap = await getDoc(doc(db, "users", currentUser.uid));
          setProfile(snap.exists() ? snap.data() : null);
        } catch (error) { setNotice(prettyError(error)); }
      }
      setAuthLoading(false);
    });
  }, []);

  const isAdmin = profile?.role === "admin";
  const visibleFleet = useMemo(
    () => filter === "All vehicles" ? fleet : fleet.filter((car) => car.type === filter),
    [filter]
  );
  const go = (next) => {
    setPage(next); setMenuOpen(false); setModal("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const book = (car = null) => {
    setSelectedCar(car); setPage("Book Now"); setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const openAuth = (mode = "signin") => {
    setAuthMode(mode); setAuthError(""); setModal("auth");
  };

  async function handleAuthSubmit(event) {
    event.preventDefault();
    if (!firebaseReady) return;
    setAuthBusy(true); setAuthError("");
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    try {
      if (authMode === "register") {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        if (name) await updateProfile(credential.user, { displayName: name });
        await addDoc(collection(db, "_profileSetupAudit"), { uid: credential.user.uid, createdAt: serverTimestamp() }).catch(() => {});
        const userRef = doc(db, "users", credential.user.uid);
        const { setDoc } = await import("firebase/firestore");
        await setDoc(userRef, {
          uid: credential.user.uid, name, email, phone: "", role: "customer",
          createdAt: serverTimestamp()
        });
        setModal(""); setNotice("Your account has been created.");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        setModal(""); setNotice("Welcome back.");
      }
    } catch (error) { setAuthError(prettyError(error)); }
    finally { setAuthBusy(false); }
  }

  async function handlePasswordReset(email) {
    if (!email) { setAuthError("Enter your email address first."); return; }
    try { await sendPasswordResetEmail(auth, email); setAuthError("Password reset email sent. Check your inbox."); }
    catch (error) { setAuthError(prettyError(error)); }
  }

  async function handleLogout() {
    await signOut(auth); setProfile(null); setPage("Home"); setNotice("You have signed out.");
  }

  async function submitBooking(event) {
    event.preventDefault();
    if (!user) { openAuth("signin"); setNotice("Please sign in before sending a booking request."); return; }
    setBookingBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      await addDoc(collection(db, "bookings"), {
        userId: user.uid,
        customerName: String(form.get("customerName")).trim(),
        email: user.email,
        phone: String(form.get("phone")).trim(),
        pickupLocation: String(form.get("pickupLocation")),
        vehicle: String(form.get("vehicle")),
        rentalType: String(form.get("rentalType")),
        pickupDate: String(form.get("pickupDate")),
        returnDate: String(form.get("returnDate")),
        message: String(form.get("message") || "").trim(),
        status: "pending",
        createdAt: serverTimestamp()
      });
      event.currentTarget.reset();
      setNotice("Your booking request has been sent. It is pending confirmation by our team.");
      setPage("My Bookings");
    } catch (error) { setNotice(prettyError(error)); }
    finally { setBookingBusy(false); }
  }

  async function submitContact(event) {
    event.preventDefault(); setContactBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      await addDoc(collection(db, "enquiries"), {
        name: String(form.get("name")).trim(),
        email: String(form.get("email")).trim(),
        phone: String(form.get("phone") || "").trim(),
        interest: String(form.get("interest")),
        message: String(form.get("message")).trim(),
        createdAt: serverTimestamp()
      });
      event.currentTarget.reset();
      setNotice("Thank you. Your enquiry has been received.");
    } catch (error) { setNotice(prettyError(error)); }
    finally { setContactBusy(false); }
  }

  async function loadMyBookings() {
    if (!user) { openAuth("signin"); return; }
    try {
      const q = query(collection(db, "bookings"), where("userId", "==", user.uid));
      const snap = await getDocs(q);
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      rows.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setMyBookings(rows); go("My Bookings");
    } catch (error) { setNotice(prettyError(error)); }
  }

  async function loadAdmin() {
    setAdminBusy(true); setAdminError("");
    try {
      const [bookingSnap, enquirySnap] = await Promise.all([
        getDocs(query(collection(db, "bookings"), limit(100))),
        getDocs(query(collection(db, "enquiries"), limit(100)))
      ]);
      setAdminBookings(bookingSnap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)));
      setAdminEnquiries(enquirySnap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)));
    } catch (error) { setAdminError(prettyError(error)); }
    finally { setAdminBusy(false); }
  }

  async function updateBookingStatus(id, status) {
    try {
      await updateDoc(doc(db, "bookings", id), { status });
      setAdminBookings(rows => rows.map(row => row.id === id ? {...row,status} : row));
    } catch (error) { setAdminError(prettyError(error)); }
  }

  function Logo() {
    return <button className="logo" onClick={() => go("Home")} aria-label="Rexaura Rentals home">
      <span className="logo-mark"><Crown size={19}/><span>◆</span></span>
      <span className="logo-word">Rexaura<small>RENTALS</small></span>
    </button>;
  }

  function Header() {
    return <header className="header"><div className="nav-wrap">
      <Logo/>
      <nav className={menuOpen ? "nav open" : "nav"}>
        {pageNames.map(p=><button key={p} className={page===p?"nav-link active":"nav-link"} onClick={()=>go(p)}>{p}</button>)}
        {user && <button className="nav-link" onClick={loadMyBookings}>My Bookings</button>}
        {isAdmin && <button className="nav-link" onClick={()=>{go("Admin");loadAdmin();}}>Admin</button>}
      </nav>
      <div className="nav-actions">
        <button className="theme-btn" onClick={()=>setTheme(theme==="dark"?"light":"dark")} aria-label="Switch theme">{theme==="dark"?<Sun size={18}/>:<Moon size={18}/>}</button>
     {user ? (
  <>
    <button
      className="btn btn-outline sign-in"
      onClick={() => loadMyBookings()}
    >
      <UserRound size={15} /> My Account
    </button>

    <button
      className="btn btn-outline sign-in"
      onClick={handleLogout}
    >
      <LogOut size={15} /> Sign Out
    </button>
  </>
) : (
  <>
    <button
      className="btn btn-outline sign-in"
      onClick={() => openAuth("signin")}
    >
      Sign In
    </button>

    <button
      className="btn btn-gold sign-up"
      onClick={() => openAuth("register")}
    >
      Sign Up
    </button>
  </>
)}

<button className="btn btn-gold book-nav" onClick={() => book()}>
  Book Now
</button>
        <button className="mobile-menu" onClick={()=>setMenuOpen(!menuOpen)} aria-label="Toggle menu">{menuOpen?<X/>:<Menu/>}</button>
      </div>
    </div></header>;
  }

  function Footer() {
    return <footer className="footer"><div className="footer-grid">
      <div><Logo/><p>Your trusted luxury car rental partner in Port Harcourt and Lagos. Experience style, comfort, and performance.</p></div>
      <div><h4>Company</h4>{["About","Services","Fleet","Contact"].map(x=><button className="footer-link" key={x} onClick={()=>go(x)}>{x}</button>)}</div>
      <div><h4>Locations</h4><p>Port Harcourt<br/>Lagos<br/>Victoria Island · Ikeja · GRA · Lekki</p></div>
      <div><h4>Contact</h4><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a><a href={`tel:${CONTACT_PHONE}`}>{phoneDisplay}</a><div className="socials"><a href={`mailto:${CONTACT_EMAIL}`} aria-label="Email"><Mail/></a><a href="#" aria-label="Instagram"><Instagram/></a><a href="#" aria-label="Facebook"><Facebook/></a></div></div>
    </div><div className="copyright">© {new Date().getFullYear()} Rexaura Rentals. All rights reserved. <span>Privacy Policy · Terms of Service</span></div></footer>;
  }

  function PageIntro({eyebrow,title,text}) {
    return <div className="page-intro"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{text}</p></div>;
  }

  function CarCard({car}) {
    return <article className="car-card"><div className="car-image"><img src={car.image} alt={car.name}/><span className="car-tag">{car.type}</span></div><div className="car-info">
      <h3>{car.name}</h3><p className="car-detail">{car.detail}</p>
      <div className="car-meta"><span><Users size={14}/>{car.seats}</span><span><Gauge size={14}/>Premium</span></div>
      <div className="car-bottom"><p>From <strong>{car.price}</strong> / day</p><button className="btn btn-gold small" onClick={()=>book(car)}>Book ride</button></div>
    </div></article>;
  }

  function BookingSearch() {
    return <form className="search-panel" onSubmit={e=>{e.preventDefault();setFilter(search.type);go("Fleet");}}>
      <h2>Book Your Ride</h2><div className="form-grid">
        <label>Pickup Location<div className="field"><MapPin/><select value={search.location} onChange={e=>setSearch({...search,location:e.target.value})}><option>Port Harcourt</option><option>Lagos</option></select></div></label>
        <label>Car Type<div className="field"><CarFront/><select value={search.type} onChange={e=>setSearch({...search,type:e.target.value})}><option>All vehicles</option>{[...new Set(fleet.map(c=>c.type))].map(t=><option key={t}>{t}</option>)}</select></div></label>
        <label>Pickup Date<div className="field"><CalendarDays/><input required type="date" min={new Date().toISOString().slice(0,10)} value={search.pickup} onChange={e=>setSearch({...search,pickup:e.target.value})}/></div></label>
        <label>Return Date<div className="field"><CalendarDays/><input required type="date" min={search.pickup || new Date().toISOString().slice(0,10)} value={search.dropoff} onChange={e=>setSearch({...search,dropoff:e.target.value})}/></div></label>
      </div><button className="btn btn-gold search-submit" type="submit">Search Cars <ArrowRight size={17}/></button><p className="micro-note">Booking requests are confirmed by our team.</p>
    </form>;
  }

  function Home() {
    return <><section className="hero"><div className="hero-bg"></div><div className="container hero-content"><div className="hero-copy">
      <span className="eyebrow"><span></span> PREMIUM CAR RENTALS</span><h1>Drive Luxury in <em>Port Harcourt</em> & Lagos</h1>
      <p>Premium G-Wagon, Range Rover and exotic fleet for hire — seamless rentals for business, events, and travel.</p>
      <div className="hero-buttons"><button className="btn btn-gold" onClick={()=>book()}>Book Your Ride <ArrowRight size={17}/></button><button className="btn btn-outline" onClick={()=>go("Fleet")}>Explore Fleet</button></div>
    </div></div></section><main className="container home-main"><div className="booking-overlap"><BookingSearch/></div>
      <section className="section fleet-preview"><div className="section-heading"><div><span className="eyebrow">THE COLLECTION</span><h2>Our Premium Fleet</h2><p>Handpicked vehicles for your premium experience.</p></div><button className="text-link" onClick={()=>go("Fleet")}>View all vehicles <ChevronRight size={17}/></button></div><div className="car-grid">{fleet.slice(0,3).map(car=><CarCard key={car.id} car={car}/>)}</div></section>
      <section className="why-section"><div><span className="eyebrow">THE REXAURA DIFFERENCE</span><h2>Travel with confidence.</h2><p>Thoughtful service, dependable vehicles and a smooth experience from enquiry to drop-off.</p></div><div className="benefits">
        <Benefit icon={<ShieldCheck/>} title="Fully Insured" text="Ask our team about coverage and rental terms."/>
        <Benefit icon={<Clock3/>} title="24/7 Support" text="Reach our team whenever your plans need attention."/>
        <Benefit icon={<Plane/>} title="Airport Pickup" text="Arrange convenient airport collection in PH and Lagos."/>
      </div></section><section className="plans"><Plan title="Weekly Rental" price="₦700k – ₦2M" period="/ week" items={["Flexible rental options","Convenient weekly arrangements","Priority booking support"]} popular onClick={()=>book()}/><Plan title="Monthly Rental" price="₦2.5M – ₦8M" period="/ month" items={["Long-stay rental options","Dedicated booking contact","Custom contract available"]} onClick={()=>book()}/></section>
    </main></>;
  }

  function Benefit({icon,title,text}) { return <div className="benefit"><span>{icon}</span><div><h3>{title}</h3><p>{text}</p></div></div>; }
  function Plan({title,price,period,items,popular,onClick}) { return <article className={popular?"plan popular":"plan"}>{popular&&<span className="popular-tag">POPULAR OPTION</span>}<h3>{title}</h3><p className="plan-price">{price}<small> {period}</small></p><ul>{items.map(i=><li key={i}><Check size={15}/>{i}</li>)}</ul><button className={popular?"btn btn-gold":"btn btn-outline"} onClick={onClick}>Enquire now</button></article>; }
  function FleetPage() {
    return <main className="container page-main"><PageIntro eyebrow="OUR COLLECTION" title="Find your perfect ride" text="Explore our selection of premium SUVs, executive sedans and exotic vehicles."/><div className="filter-row"><label>Filter by category <select value={filter} onChange={e=>setFilter(e.target.value)}><option>All vehicles</option>{[...new Set(fleet.map(c=>c.type))].map(t=><option key={t}>{t}</option>)}</select></label><span>{visibleFleet.length} vehicles</span></div><div className="car-grid">{visibleFleet.map(car=><CarCard key={car.id} car={car}/>)}</div></main>;
  }
  function AboutPage() {
    return <main className="container page-main"><PageIntro eyebrow="ABOUT REXAURA" title="A better way to move." text="Rexaura Rentals brings premium vehicle hire and attentive service together for journeys that deserve more."/><div className="about-layout"><img src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=85" alt="Premium vehicle"/><div><span className="eyebrow">OUR APPROACH</span><h2>Luxury is in the details.</h2><p>From the first enquiry to the end of your rental, our goal is to make every step clear, comfortable and dependable. We serve customers across Port Harcourt and Lagos with options for business travel, celebrations, airport transfers and personal journeys.</p><p>Tell us where you are going, what you need and when you need it. Our team will help you explore suitable vehicle and chauffeur options.</p><button className="btn btn-gold" onClick={()=>go("Contact")}>Talk to our team</button></div></div><div className="values-grid"><Value title="Care" text="Clear communication and thoughtful support."/><Value title="Quality" text="A considered range of premium vehicles."/><Value title="Reliability" text="Straightforward booking and rental coordination."/></div></main>;
  }
  function Value({title,text}) { return <div className="value-card"><Star/><h3>{title}</h3><p>{text}</p></div>; }
  function ServicesPage() {
    const services=[{icon:<CarFront/>,title:"Self-drive rentals",text:"Choose a vehicle for your own itinerary, subject to eligibility and rental terms."},{icon:<UserRound/>,title:"Chauffeur service",text:"Request a professional driver for business, events and personal journeys."},{icon:<Plane/>,title:"Airport transfers",text:"Arrange pickup and drop-off at Port Harcourt or Lagos airports."},{icon:<Crown/>,title:"Events & occasions",text:"Make arrivals memorable with a premium vehicle for your special day."},{icon:<Clock3/>,title:"Weekly & monthly hire",text:"Ask about extended rental arrangements and tailored quotations."},{icon:<ShieldCheck/>,title:"Corporate rentals",text:"Coordinate vehicle hire for teams, visitors and business travel."}];
    return <main className="container page-main"><PageIntro eyebrow="WHAT WE OFFER" title="More than a rental." text="Flexible vehicle hire solutions for everyday plans and milestone moments."/><div className="service-grid">{services.map(s=><article className="service-card" key={s.title}><span>{s.icon}</span><h3>{s.title}</h3><p>{s.text}</p><button className="text-link" onClick={()=>go("Contact")}>Make an enquiry <ArrowRight size={15}/></button></article>)}</div></main>;
  }
  function ContactPage() {
    return <main className="container page-main"><PageIntro eyebrow="GET IN TOUCH" title="Let's plan your next ride." text="Share a few details and our team will get back to you about your rental enquiry."/><div className="contact-layout">
      <form className="form-card" onSubmit={submitContact}><h2>Send an enquiry</h2><div className="form-grid">
        <label>Your name<input name="name" required minLength="2" placeholder="Full name"/></label>
        <label>Email address<input name="email" required type="email" placeholder="you@example.com"/></label>
        <label>Phone number<input name="phone" placeholder="+234..."/></label>
        <label>I'm interested in<select name="interest"><option>Vehicle rental</option><option>Chauffeur service</option><option>Airport transfer</option><option>Corporate rental</option></select></label>
      </div><label>Message<textarea name="message" required minLength="5" rows="5" placeholder="Tell us about your plans..."/></label><button className="btn btn-gold" disabled={contactBusy}>{contactBusy?"Sending...":"Send enquiry"} <ArrowRight size={16}/></button></form>
      <aside className="contact-aside"><h2>Contact details</h2><p><Mail/> <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p><p><Phone/> <a href={`tel:${CONTACT_PHONE}`}>{phoneDisplay}</a></p><p><MapPin/> Port Harcourt & Lagos, Nigeria</p><div className="aside-note"><h3>Need a quick response?</h3><p>Call or email us with your preferred vehicle, dates and pickup location.</p></div></aside>
    </div></main>;
  }
  function BookingPage() {
    return <main className="container page-main"><PageIntro eyebrow="RESERVATIONS" title="Book your ride." text="Send a booking request and our team will contact you to confirm availability and rental terms."/><div className="booking-layout">
      <form className="form-card" onSubmit={submitBooking}><h2>{selectedCar?selectedCar.name:"Rental enquiry"}</h2>{!user&&<p className="inline-hint">You'll need to <button type="button" className="inline-button" onClick={()=>openAuth("signin")}>sign in</button> before submitting a booking request.</p>}
        <div className="form-grid">
          <label>Full name<input name="customerName" required defaultValue={user?.displayName||profile?.name||""} placeholder="Your name"/></label>
          <label>Phone number<input name="phone" required defaultValue={profile?.phone||""} placeholder="+234..."/></label>
          <label>Pickup location<select name="pickupLocation"><option>Port Harcourt</option><option>Lagos</option></select></label>
          <label>Vehicle<select name="vehicle" defaultValue={selectedCar?.name||""}><option value="">Any available vehicle</option>{fleet.map(c=><option key={c.id}>{c.name}</option>)}</select></label>
          <label>Rental type<select name="rentalType"><option>Daily</option><option>Weekly</option><option>Monthly</option></select></label>
          <label>Pickup date<input name="pickupDate" required type="date" min={new Date().toISOString().slice(0,10)}/></label>
          <label>Return date<input name="returnDate" required type="date" min={new Date().toISOString().slice(0,10)}/></label>
        </div><label>Additional details<textarea name="message" rows="4" placeholder="Chauffeur, airport pickup, event details..."/></label>
        <button className="btn btn-gold" disabled={bookingBusy}>{bookingBusy?"Submitting...":"Submit booking request"} <ArrowRight size={16}/></button>
        <p className="micro-note">This is a request, not a confirmed reservation. Our team will confirm availability and final pricing.</p>
      </form><aside className="booking-aside"><h3>Booking with confidence</h3><p><ShieldCheck/> Availability and final pricing are confirmed by our team.</p><p><Clock3/> Share your dates early for the best chance of securing your preferred vehicle.</p><p><Phone/> Need help? {phoneDisplay}</p></aside>
    </div></main>;
  }
  async function MyBookingsPage() {
    return null;
  }
  function MyBookings() {
    return <main className="container page-main"><PageIntro eyebrow="YOUR ACCOUNT" title="My booking requests" text="Review the latest status of your rental enquiries."/>
      {myBookings.length===0?<div className="empty-state"><ClipboardList/><h3>No booking requests yet</h3><p>Your booking requests will appear here after you submit one.</p><button className="btn btn-gold" onClick={()=>book()}>Make a booking request</button></div>:<div className="table-wrap"><table><thead><tr><th>Vehicle</th><th>Pickup</th><th>Return</th><th>Status</th></tr></thead><tbody>{myBookings.map(b=><tr key={b.id}><td>{b.vehicle}</td><td>{b.pickupDate}</td><td>{b.returnDate}</td><td><span className={`status ${b.status}`}>{b.status}</span></td></tr>)}</tbody></table></div>}
    </main>;
  }
  function AdminPage() {
    return <main className="container page-main"><PageIntro eyebrow="MANAGEMENT" title="Admin dashboard" text="Review booking requests and customer enquiries."/>
      <div className="admin-toolbar"><div className="admin-stat"><strong>{adminBookings.length}</strong><span>Booking requests</span></div><div className="admin-stat"><strong>{adminEnquiries.length}</strong><span>Contact enquiries</span></div><button className="btn btn-outline" onClick={loadAdmin} disabled={adminBusy}><RefreshCw size={15}/> Refresh</button></div>
      {adminError&&<p className="error-text">{adminError}</p>}
      <h2 className="subheading">Booking requests</h2>{adminBusy?<p>Loading requests...</p>:<div className="table-wrap"><table><thead><tr><th>Customer</th><th>Vehicle</th><th>Dates</th><th>Contact</th><th>Status</th></tr></thead><tbody>{adminBookings.map(b=><tr key={b.id}><td>{b.customerName}</td><td>{b.vehicle}</td><td>{b.pickupDate} – {b.returnDate}</td><td>{b.phone}<br/>{b.email}</td><td><select value={b.status} onChange={e=>updateBookingStatus(b.id,e.target.value)}><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></td></tr>)}</tbody></table>{adminBookings.length===0&&<p className="empty-table">No booking requests found.</p>}</div>}
      <h2 className="subheading">Contact enquiries</h2><div className="enquiry-grid">{adminEnquiries.map(e=><article className="enquiry-card" key={e.id}><strong>{e.name}</strong><span>{e.email} · {e.phone||"No phone"}</span><small>{e.interest}</small><p>{e.message}</p></article>)}</div>{adminEnquiries.length===0&&<p className="muted">No contact enquiries found.</p>}
    </main>;
  }
  function AuthModal() {
    if (modal!=="auth") return null;
    return <div className="modal-backdrop" onClick={()=>setModal("")}><div className="modal" onClick={e=>e.stopPropagation()}>
      <button className="modal-close" onClick={()=>setModal("")}><X/></button><span className="eyebrow">REXAURA ACCOUNT</span><h2>{authMode==="register"?"Create your account":"Welcome back"}</h2>
      {!firebaseReady&&<div className="warning"><AlertCircle/> Firebase is not configured yet. Add your Firebase environment variables before using accounts.</div>}
      <form onSubmit={handleAuthSubmit}>
        {authMode==="register"&&<label>Full name<input name="name" required minLength="2" placeholder="Your full name"/></label>}
        <label>Email address<input name="email" required type="email" placeholder="you@example.com"/></label>
        <label>Password<input name="password" required type="password" minLength="6" placeholder="At least 6 characters"/></label>
        {authError&&<p className="error-text">{authError}</p>}
        <button className="btn btn-gold full" disabled={authBusy||!firebaseReady}>{authBusy?"Please wait...":authMode==="register"?"Create account":"Sign in"}</button>
      </form>
      {authMode==="signin"&&<button className="text-link reset-link" onClick={()=>{const email=document.querySelector('.modal input[name="email"]')?.value;handlePasswordReset(email);}}>Forgot password?</button>}
      <p className="switch-auth">{authMode==="register"?"Already have an account?":"New to Rexaura?"} <button onClick={()=>{setAuthMode(authMode==="register"?"signin":"register");setAuthError("");}}>{authMode==="register"?"Sign in":"Create account"}</button></p>
    </div></div>;
  }

  if (authLoading) return <div className="loading-screen">Loading Rexaura Rentals...</div>;
  let currentPage;
  if (page==="Home") currentPage=<Home/>;
  else if (page==="Fleet") currentPage=<FleetPage/>;
  else if (page==="About") currentPage=<AboutPage/>;
  else if (page==="Services") currentPage=<ServicesPage/>;
  else if (page==="Contact") currentPage=<ContactPage/>;
  else if (page==="Book Now") currentPage=<BookingPage/>;
  else if (page==="My Bookings") currentPage=<MyBookings/>;
  else if (page==="Admin" && isAdmin) currentPage=<AdminPage/>;
  else currentPage=<Home/>;

  return <><Header/>{!firebaseReady&&<div className="config-banner"><AlertCircle size={16}/> Firebase setup required: add the VITE_FIREBASE environment variables to connect accounts and forms. <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer">Open Firebase</a></div>}
    {notice&&<div className="toast" role="status"><span>{notice}</span><button onClick={()=>setNotice("")}><X size={16}/></button></div>}
    {currentPage}<Footer/><AuthModal/>
  </>;
}

createRoot(document.getElementById("root")).render(<App/>);
