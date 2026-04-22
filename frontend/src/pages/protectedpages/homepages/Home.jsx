import React, { useRef } from "react";
import Header from "../../../components/Header";
import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
import online from "../../../assets/onlinesvg.png";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

function Counter({ from = 0, to = 1000, duration = 1.6, className = "text-3xl font-bold" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const motionVal = useMotionValue(from);
  const spring = useSpring(motionVal, { stiffness: 90, damping: 20 });

  React.useEffect(() => {
    if (inView) {
      motionVal.set(to);
    }
  }, [inView, motionVal, to]);

  const [value, setValue] = React.useState(from);
  React.useEffect(() => {
    const unsubscribe = spring.on("change", (v) => setValue(Math.round(v)));
    return () => unsubscribe();
  }, [spring]);

  return (
    <div ref={ref} className={className}>
      {value}
    </div>
  );
}

const Home = () => {
  const features = [
    { title: "Customer Ledger", desc: "Keep a neat history of customer purchases and dues.", emoji: "📒" },
    { title: "Inventory Sync", desc: "Quickly update stock and pricing across devices.", emoji: "📦" },
    { title: "Payments & Dues", desc: "Record partial payments, reminders and settlements.", emoji: "💸" },
    { title: "Reports & Insights", desc: "Simple charts to help you pick top-selling items.", emoji: "📈" },
    { title: "Offline Support", desc: "Work offline; sync when network is available.", emoji: "⚡" },
    { title: "Multi-user", desc: "Give access to staff with role-based controls.", emoji: "👥" },
  ];

  const testimonials = [
    { name: "Sita K.", text: "Digital Khata made running my shop so much easier — I stopped losing track of credit.", role: "Shopkeeper" },
    { name: "Raju P.", text: "Inventory updates are instant and simple. Love the reports.", role: "Shop Owner" },
    { name: "Maya T.", text: "Our customers like getting receipts and reminders. Very professional.", role: "Shopkeeper" },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Decorative floating blob */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute right-0 top-24 -z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.12 }}
      >
        <svg width="420" height="420" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
          <motion.circle cx="200" cy="200" r="180" fill="#3b82f6" />
        </svg>
      </motion.div>

      {/* HERO */}
      <section className="relative px-6 pt-12 pb-16 md:py-24 max-w-6xl mx-auto grid md:grid-cols-2 gap-8 items-center">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="space-y-6">
          <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight">
            Transform Your Shop with <span className="text-blue-600">Digital Khata</span>
          </motion.h1>

          <motion.p variants={fadeUp} className="text-gray-600 text-lg max-w-xl">
            No more paper ledgers. Track customers, manage products, record dues, and handle sales — all from one
            smart, fast, and offline-ready platform built for local shopkeepers.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-wrap gap-4">
            <motion.button whileHover={{ scale: 1.03 }} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium shadow">Start Managing</motion.button>
            <motion.button whileHover={{ scale: 1.03 }} className="border border-gray-300 px-6 py-3 rounded-xl">Request Demo</motion.button>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-6 grid grid-cols-3 gap-4">
            <div className="bg-gradient-to-r from-white/60 to-white/30 p-4 rounded-xl shadow">
              <div className="text-sm text-gray-500">Shops onboarded</div>
              <Counter to={482} className="text-2xl font-bold text-blue-600 mt-1" />
            </div>
            <div className="bg-gradient-to-r from-white/60 to-white/30 p-4 rounded-xl shadow">
              <div className="text-sm text-gray-500">Avg. weekly sales</div>
              <div className="text-2xl font-bold mt-1">₹ <Counter from={0} to={124000} className="inline" /></div>
            </div>
            <div className="bg-gradient-to-r from-white/60 to-white/30 p-4 rounded-xl shadow">
              <div className="text-sm text-gray-500">Active users</div>
              <Counter to={921} className="text-2xl font-bold text-blue-600 mt-1" />
            </div>
          </motion.div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="flex justify-center">
          <motion.img
            src={online}
            alt="Digital Shop"
            className="max-w-sm md:max-w-md rounded-2xl shadow-2xl"
            whileHover={{ scale: 1.02, rotate: -1 }}
          />
        </motion.div>
      </section>

      {/* FEATURES */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <motion.h2 initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} className="text-3xl font-bold text-center text-gray-800">Powerful features built for shops</motion.h2>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="mt-12 grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div key={f.title} variants={fadeUp} whileHover={{ scale: 1.03 }} className="bg-white p-6 rounded-xl shadow border">
                <div className="text-3xl">{f.emoji}</div>
                <h3 className="mt-3 font-semibold text-lg text-gray-900">{f.title}</h3>
                <p className="mt-2 text-gray-600 text-sm">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          <motion.h2 className="text-2xl font-bold text-center text-gray-800" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>What shopkeepers say</motion.h2>

          <motion.div className="mt-8 grid md:grid-cols-3 gap-6" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            {testimonials.map((t, i) => (
              <motion.blockquote key={t.name} variants={fadeUp} className="bg-white p-6 rounded-xl shadow border">
                <p className="text-gray-700">“{t.text}”</p>
                <footer className="mt-4 text-sm text-gray-500">— {t.name}, <span className="text-gray-400">{t.role}</span></footer>
              </motion.blockquote>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-6">
          <motion.h3 initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} className="text-xl font-bold text-gray-900 text-center">Frequently asked</motion.h3>

          <motion.div className="mt-6 space-y-3">
            <motion.details className="bg-white p-4 rounded-xl shadow" open>
              <summary className="cursor-pointer font-medium">Can I use it offline?</summary>
              <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="mt-2 text-gray-600">Yes — you can record sales offline and sync later when online.</motion.div>
            </motion.details>

            <motion.details className="bg-white p-4 rounded-xl shadow">
              <summary className="cursor-pointer font-medium">Is there a mobile app?</summary>
              <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="mt-2 text-gray-600">We support mobile-first responsive web and are rolling native apps soon.</motion.div>
            </motion.details>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.h3 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="text-2xl font-bold">Start simplifying your shop today</motion.h3>
          <motion.div className="mt-4 flex justify-center gap-4">
            <motion.button whileHover={{ scale: 1.03 }} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium shadow">Get Started</motion.button>
            <motion.button whileHover={{ scale: 1.03 }} className="border border-gray-300 px-6 py-3 rounded-xl">Contact Sales</motion.button>
          </motion.div>
        </div>
      </section>

      <footer className="py-6 text-center text-gray-600">© {new Date().getFullYear()} Digital Khata — Helping Shopkeepers Go Digital</footer>
    </div>
  );
};

export default Home;
