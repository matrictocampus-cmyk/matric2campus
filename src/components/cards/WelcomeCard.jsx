export default function WelcomeCard() {
  return (
    <div className="bg-gradient-to-r from-green-700 to-green-500 text-white 
                    p-6 rounded-2xl shadow-xl shadow-green-500/30">
      <h3 className="text-2xl font-bold">Welcome back to TXI 👋</h3>
      <p className="mt-2 text-sm text-green-200">
        Complete your profile to get personalized institution matches.
      </p>
      <p className="mt-1 text-sm text-green-100">
        Applications are now easier than ever. Your future starts here.
      </p>
    </div>
  );
}
