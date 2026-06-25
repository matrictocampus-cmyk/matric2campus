// src/pages/Admin/HelpSupport.jsx
import { HelpCircle, MessageSquare, BookOpen, FileText, Phone, Mail } from "lucide-react";

export default function HelpSupport() {
  const faqs = [
    { question: "How do I claim a bundle?", answer: "Click the 'Claim' button next to an available bundle in the Dashboard." },
    { question: "What does 'Action Required' mean?", answer: "It means the bundle needs additional attention or information before it can proceed." },
    { question: "How do I update bundle status?", answer: "Use the status buttons (In Progress, Complete, etc.) in the My Work section." },
    { question: "Where can I see all bundles?", answer: "Go to 'All Bundles' in the sidebar to view every bundle in the system." },
    { question: "How do I generate reports?", answer: "Visit the Reports page and select the type of report you want to generate." },
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Help & Support</h1>
        <p className="text-gray-600">Get help and find answers to your questions</p>
      </div>

      {/* Quick Help Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold">Documentation</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">Browse our comprehensive guides and tutorials</p>
          <button className="w-full px-4 py-2 bg-white border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50">
            View Docs
          </button>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <MessageSquare className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold">Live Chat</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">Chat with our support team in real-time</p>
          <button className="w-full px-4 py-2 bg-white border border-green-300 text-green-600 rounded-lg hover:bg-green-50">
            Start Chat
          </button>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold">Knowledge Base</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">Find answers to common questions</p>
          <button className="w-full px-4 py-2 bg-white border border-purple-300 text-purple-600 rounded-lg hover:bg-purple-50">
            Browse Articles
          </button>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold">Frequently Asked Questions</h3>
          <HelpCircle className="w-5 h-5 text-gray-400" />
        </div>
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-4">
              <details className="group">
                <summary className="flex items-center justify-between cursor-pointer">
                  <span className="font-medium text-gray-900">{faq.question}</span>
                  <span className="text-gray-500 group-open:hidden">+</span>
                  <span className="text-gray-500 hidden group-open:inline">−</span>
                </summary>
                <div className="mt-3 text-gray-600">
                  {faq.answer}
                </div>
              </details>
            </div>
          ))}
        </div>
      </div>

      {/* Contact Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold mb-4">Contact Support</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Email</p>
                <p className="text-sm text-gray-600">support@yourapp.com</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Phone className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Phone</p>
                <p className="text-sm text-gray-600">+1 (555) 123-4567</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold mb-4">System Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">API Service</span>
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-600">Operational</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Database</span>
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-600">Operational</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">File Storage</span>
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-600">Operational</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}