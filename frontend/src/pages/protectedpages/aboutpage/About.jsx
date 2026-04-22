import React, { useEffect, useState } from "react";
import Header from "../../../components/Header";
import { motion } from "framer-motion";

// Small CountUp hook for stats
function useCountUp(target, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = null;
    const from = 0;
    const diff = target - from;

    function step(timestamp) {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      setValue(Math.floor(from + diff * progress));
      if (elapsed < duration) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }, [target, duration]);

  return value;
}

const heroVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i = 1) => ({ opacity: 1, y: 0, transition: { delay: 0.12 * i, ease: "easeOut" } }),
};

const About = () => {
  const shopsCount = useCountUp(1200, 1400);
  const usersCount = useCountUp(32000, 1400);
  const salesCount = useCountUp(540000, 1400);

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* HERO */}
      <motion.section
        className="px-6 pt-12 pb-8 max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center"
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
      >
        <motion.div variants={heroVariants} custom={1} className="space-y-6">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight">
            We help local shops thrive —
            <span className="text-blue-600"> smarter, faster, simpler.</span>
          </h1>

          <p className="text-gray-600 text-lg">
            Digital Khata is built to modernize neighborhood shops. We provide an easy-to-use
            platform for inventory, credit tracking, and sales insights so shopkeepers can focus on customers.
          </p>

          <div className="flex gap-4">
            <motion.a
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl shadow font-medium"
              href="#"
            >
              Get Started
            </motion.a>

            <motion.a whileHover={{ scale: 1.03 }} className="inline-block border px-6 py-3 rounded-xl" href="#">
              Learn how we work
            </motion.a>
          </div>
        </motion.div>

        <motion.div variants={heroVariants} custom={2} className="flex justify-center">
          <div className="relative">
            <svg className="absolute -left-10 -top-8 opacity-10" width="220" height="220" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="100" cy="100" r="80" stroke="#3b82f6" strokeWidth="8" />
            </svg>

            <img
              src="/src/api/../assets/react.svg"
              alt="about-illustration"
              className="w-64 h-64 rounded-xl shadow-lg object-contain bg-white p-6"
            />
          </div>
        </motion.div>
      </motion.section>

      {/* STATS */}
      <section className="bg-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <motion.div whileInView={{ y: 0, opacity: 1 }} initial={{ y: 12, opacity: 0 }} viewport={{ once: true }} className="bg-white p-6 rounded-xl shadow">
            <div className="text-3xl font-bold text-blue-600">{shopsCount.toLocaleString()}</div>
            <div className="text-gray-600 mt-2">Shops on Digital Khata</div>
          </motion.div>

          <motion.div whileInView={{ y: 0, opacity: 1 }} initial={{ y: 12, opacity: 0 }} viewport={{ once: true }} className="bg-white p-6 rounded-xl shadow">
            <div className="text-3xl font-bold text-blue-600">{usersCount.toLocaleString()}</div>
            <div className="text-gray-600 mt-2">Monthly customers tracked</div>
          </motion.div>

          <motion.div whileInView={{ y: 0, opacity: 1 }} initial={{ y: 12, opacity: 0 }} viewport={{ once: true }} className="bg-white p-6 rounded-xl shadow">
            <div className="text-3xl font-bold text-blue-600">{salesCount.toLocaleString()}</div>
            <div className="text-gray-600 mt-2">Total sales processed</div>
          </motion.div>
        </div>
      </section>

      {/* MISSION + TEAM */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-10 items-start">
          <motion.div initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-4">
            <h3 className="text-2xl font-bold">Our mission</h3>
            <p className="text-gray-600">To empower shopkeepers with tools that are intuitive, affordable, and built for the realities of neighborhood retail.</p>

            <ul className="mt-4 space-y-2">
              <li className="flex items-start gap-3">
                <span className="text-blue-600">•</span>
                <span className="text-gray-700">Offline-first experience and low-data usage.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-600">•</span>
                <span className="text-gray-700">Simple bookkeeping & credit tracking for daily use.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-600">•</span>
                <span className="text-gray-700">Actionable sales insights to grow sustainably.</span>
              </li>
            </ul>
          </motion.div>

          <motion.div className="grid grid-cols-1 gap-4" initial={{ opacity: 0, x: 10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <h4 className="text-xl font-semibold">Meet the team</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { name: "Ramesh", role: "Founder & Product", bio: "Ex-retailer building better tools for shops." },
                { name: "Sita", role: "Engineering Lead", bio: "Shipping fast, reliable apps for low-connectivity environments." },
              ].map((m) => (
                <motion.div key={m.name} whileHover={{ y: -6 }} className="bg-white p-4 rounded-xl shadow flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">{m.name[0]}</div>
                  <div>
                    <div className="font-semibold">{m.name}</div>
                    <div className="text-sm text-gray-500">{m.role}</div>
                    <div className="text-sm text-gray-600 mt-2">{m.bio}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ + CTA */}
      <section className="bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-6">
          <motion.h3 className="text-2xl font-bold text-center" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            Frequently asked
          </motion.h3>

          <div className="mt-6 space-y-3">
            {[
              { q: "Is there a monthly fee?", a: "We have a free tier for small shops and affordable paid plans as you grow." },
              { q: "Can I use it offline?", a: "Yes — the app caches data and syncs when a connection is available." },
              { q: "How do I move from paper to digital?", a: "We provide simple import and manual entry options, plus friendly in-app guidance." },
            ].map((f, idx) => (
              <motion.details key={f.q} className="bg-white p-4 rounded-xl shadow" initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                <summary className="font-medium cursor-pointer">{f.q}</summary>
                <p className="text-gray-600 mt-2">{f.a}</p>
              </motion.details>
            ))}
          </div>

          <div className="mt-8 text-center">
            <motion.a whileHover={{ scale: 1.03 }} className="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl shadow font-medium" href="#">Start free trial</motion.a>
          </div>
        </div>
      </section>

      <footer className="py-6 text-center text-gray-600">© {new Date().getFullYear()} Digital Khata</footer>
    </div>
  );
};

export default About;