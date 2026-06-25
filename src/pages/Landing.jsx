import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle,
  Users,
  BookOpen,
  Shield,
  Award,
  Target,
  Zap,
  Star,
  ChevronRight,
  Globe,
  Lock,
  Mail,
  Phone,
  MapPin,
  Calendar,
  TrendingUp,
  Heart,
} from "lucide-react";

// Import your auth components
import Login from "./Auth/Login";
import Register from "./Auth/Register";

export default function Landing() {
  const [showRegister, setShowRegister] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const navigate = useNavigate();

  const features = [
    {
      icon: <Target className="h-8 w-8" />,
      title: "Smart Applications System",
      description: "Smart tools to find courses that fit your exact profile and academic results.",
      color: "from-emerald-500 to-teal-500",
    },
    {
      icon: <Zap className="h-8 w-8" />,
      title: "One-Click Applications",
      description: "Apply to multiple institutions with a single application. Save hours of work.",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Expert Guidance",
      description: "Get expert advice and support throughout your application journey.",
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: <TrendingUp className="h-8 w-8" />,
      title: "Track & Optimize",
      description: "Monitor your applications and get insights to improve your chances.",
      color: "from-orange-500 to-red-500",
    },
  ];

  const testimonials = [
    {
      name: "Sarah M.",
      role: "Medical Student",
      text: "TXI helped me secure my spot & funding for all 6 medical schools I applied to. The guidance was invaluable!",
      avatar: "👩‍⚕️",
    },
    {
      name: "James K.",
      role: "Engineering Student",
      text: "As a first-generation student, I had no idea how to navigate application portals. This platform made it simple.",
      avatar: "👨‍🔬",
    },
    {
      name: "Lerato P.",
      role: "Commerce Graduate",
      text: "The expert reviews caught errors in my applications I would have missed. Got courses that I qualify for at one Application without wasting money!",
      avatar: "👩‍🎓",
    },
  ];

  const stats = [
    { value: "95%", label: "Success Rate", icon: <CheckCircle /> },
    { value: "2,500+", label: "Students Helped", icon: <Users /> },
    { value: "R45M+", label: "University spot Secured", icon: <Award /> },
    { value: "24/7", label: "Expert Support", icon: <Globe /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-emerald-50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-emerald-100 bg-white/90 backdrop-blur-md">
        <div className="container mx-auto px-6">
          <div className="flex h-20 items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-500">
                <BookOpen className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-emerald-900">TXI-Tertiary Express Interface</h1>
                <p className="text-xs text-emerald-600">Smart Applications Solutions</p>
              </div>
            </div>

            <nav className="hidden items-center space-x-8 md:flex">
              <a href="#features" className="font-medium text-emerald-700 hover:text-emerald-600">
                Features
              </a>
              <a href="#how-it-works" className="font-medium text-emerald-700 hover:text-emerald-600">
                How It Works
              </a>
              <a href="#testimonials" className="font-medium text-emerald-700 hover:text-emerald-600">
                Success Stories
              </a>
              <a href="#pricing" className="font-medium text-emerald-700 hover:text-emerald-600">
                Pricing
              </a>
            </nav>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowRegister(false)}
                className="hidden rounded-full px-6 py-2.5 font-medium text-emerald-700 hover:bg-emerald-50 md:block"
              >
                Sign In
              </button>
              <button
                onClick={() => setShowRegister(true)}
                className="rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-2.5 font-medium text-white shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-300"
              >
                Get Started Free
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-emerald-200 to-teal-200 opacity-50 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-teal-200 to-emerald-200 opacity-50 blur-3xl" />

        <div className="container relative mx-auto px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="mb-6 inline-flex items-center rounded-full bg-emerald-100 px-4 py-1.5">
                <Star className="mr-2 h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">
                  Trusted by 2,500+ South African Students
                </span>
              </div>

              <h1 className="mb-6 text-5xl font-bold leading-tight text-emerald-900 lg:text-6xl">
                Secure Your Future with{" "}
                <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                  Smart Applications
                </span>
              </h1>

              <p className="mb-8 text-xl text-emerald-700">
                We match you with the perfect bursaries, handle your applications, and provide expert
                guidance—all in one platform. Your dream education, funded.
              </p>

              <div className="flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
                <button
                  onClick={() => setShowRegister(true)}
                  className="flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 px-8 py-4 font-semibold text-white shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-300"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </button>
                <button className="flex items-center justify-center rounded-full border-2 border-emerald-200 bg-white px-8 py-4 font-semibold text-emerald-700 hover:bg-emerald-50">
                  <Play className="mr-2 h-5 w-5" />
                  Watch Demo
                </button>
              </div>

              {/* Stats */}
              <div className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="mb-2 flex items-center justify-center text-2xl font-bold text-emerald-900">
                      {stat.icon}
                      <span className="ml-2">{stat.value}</span>
                    </div>
                    <div className="text-sm text-emerald-600">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Auth Card */}
            <div className="rounded-3xl bg-white p-8 shadow-2xl shadow-emerald-100">
              <div className="mb-8 flex space-x-4 border-b border-emerald-100">
                <button
                  onClick={() => setShowRegister(false)}
                  className={`pb-4 font-semibold ${!showRegister ? "border-b-2 border-emerald-600 text-emerald-900" : "text-emerald-500"}`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setShowRegister(true)}
                  className={`pb-4 font-semibold ${showRegister ? "border-b-2 border-emerald-600 text-emerald-900" : "text-emerald-500"}`}
                >
                  Create Account
                </button>
              </div>

              {showRegister ? (
                <Register onLoginClick={() => setShowRegister(false)} />
              ) : (
                <Login onRegisterClick={() => setShowRegister(true)} />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold text-emerald-900">
              Everything You Need to Secure Your 
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-emerald-600">
              Our platform combines technology with human expertise to maximize your bursary success.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group cursor-pointer rounded-2xl border border-emerald-100 bg-white p-6 transition-all hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-50"
                onMouseEnter={() => setActiveFeature(index)}
              >
                <div
                  className={`mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color}`}
                >
                  <div className="text-white">{feature.icon}</div>
                </div>
                <h3 className="mb-3 text-xl font-bold text-emerald-900">{feature.title}</h3>
                <p className="text-emerald-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-gradient-to-b from-emerald-50 to-white">
        <div className="container mx-auto px-6">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold text-emerald-900">How It Works</h2>
            <p className="mx-auto max-w-2xl text-lg text-emerald-600">
              Simple steps from registration to secured funding
            </p>
          </div>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-1/2 top-0 hidden h-full w-0.5 -translate-x-1/2 bg-gradient-to-b from-emerald-300 to-teal-300 md:block" />

            {/* Steps */}
            {[
              {
                step: "01",
                title: "Create Your Profile",
                description: "Tell us about your academics, interests, and financial situation.",
                icon: "📝",
              },
              {
                step: "02",
                title: "Get Smart Matches",
                description: "Our Advanced smart tools finds courses that match your profile perfectly.",
                icon: "🎯",
              },
              {
                step: "03",
                title: "Expert Application Review",
                description: "Our experts review and optimize every application before submission.",
                icon: "👨‍🏫",
              },
              {
                step: "04",
                title: "Track & Celebrate",
                description: "Monitor progress and celebrate when you secure your tertiary spot!",
                icon: "🎉",
              },
            ].map((step, index) => (
              <div
                key={index}
                className={`relative mb-12 flex flex-col items-center md:flex-row ${index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}
              >
                {/* Step content */}
                <div className="md:w-1/2">
                  <div
                    className={`rounded-2xl bg-white p-8 shadow-xl shadow-emerald-100 ${index % 2 === 0 ? "md:mr-12" : "md:ml-12"}`}
                  >
                    <div className="mb-4 flex items-center">
                      <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl">
                        {step.icon}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-emerald-600">STEP {step.step}</div>
                        <h3 className="text-2xl font-bold text-emerald-900">{step.title}</h3>
                      </div>
                    </div>
                    <p className="text-emerald-600">{step.description}</p>
                  </div>
                </div>

                {/* Timeline dot */}
                <div className="absolute left-1/2 top-1/2 z-10 hidden h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-emerald-500 shadow-lg md:block" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold text-emerald-900">Student Success Stories</h2>
            <p className="mx-auto max-w-2xl text-lg text-emerald-600">
              Hear from students who secured their dream education with our help
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="rounded-2xl border border-emerald-100 bg-gradient-to-b from-white to-emerald-50 p-8"
              >
                <div className="mb-6 flex items-center">
                  <div className="mr-4 text-4xl">{testimonial.avatar}</div>
                  <div>
                    <h4 className="font-bold text-emerald-900">{testimonial.name}</h4>
                    <p className="text-sm text-emerald-600">{testimonial.role}</p>
                  </div>
                </div>
                <p className="text-emerald-700">{testimonial.text}</p>
                <div className="mt-6 flex text-emerald-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-current" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-emerald-600 to-teal-500">
        <div className="container mx-auto px-6 text-center">
          <h2 className="mb-6 text-4xl font-bold text-white">
            Ready to Secure Your Education & Future?
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-xl text-emerald-100">
            Join thousands of successful students today. TXI gives learners a better chance for a brighter future
          </p>
          <button
            onClick={() => setShowRegister(true)}
            className="rounded-full bg-white px-10 py-4 font-semibold text-emerald-700 shadow-2xl hover:bg-emerald-50"
          >
            Start Your Free Trial Now
            <ArrowRight className="ml-2 inline h-5 w-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-emerald-900 py-12">
        <div className="container mx-auto px-6">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="mb-6 flex items-center">
                <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white">
                  <BookOpen className="h-6 w-6 text-emerald-900" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">TXI-Tertiary eXpress Interface</h3>
                  <p className="text-sm text-emerald-300">Smart Applications Solutions</p>
                </div>
              </div>
              <p className="text-emerald-300">
                Empowering South African students to access quality education through smart applications
                solutions.
              </p>
            </div>

            <div>
              <h4 className="mb-4 font-semibold text-white">Company</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-emerald-300 hover:text-white">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="text-emerald-300 hover:text-white">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="text-emerald-300 hover:text-white">
                    Press
                  </a>
                </li>
                <li>
                  <a href="#" className="text-emerald-300 hover:text-white">
                    Blog
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-semibold text-white">Support</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-emerald-300 hover:text-white">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="text-emerald-300 hover:text-white">
                    Contact Us
                  </a>
                </li>
                <li>
                  <a href="#" className="text-emerald-300 hover:text-white">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-emerald-300 hover:text-white">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-semibold text-white">Contact</h4>
              <ul className="space-y-3">
                <li className="flex items-center text-emerald-300">
                  <Mail className="mr-3 h-5 w-5" />
                  help@txibursary.co.za
                </li>
                <li className="flex items-center text-emerald-300">
                  <Phone className="mr-3 h-5 w-5" />
                  0800 123 456
                </li>
                <li className="flex items-center text-emerald-300">
                  <MapPin className="mr-3 h-5 w-5" />
                  Durban, South Africa
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-emerald-800 pt-8 text-center">
            <p className="text-emerald-400">
              © {new Date().getFullYear()} TXI-Tertiary eXpress Interface . All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Custom Play icon component
const Play = (props) => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);