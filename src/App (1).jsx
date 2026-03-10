import { useState } from "react";
import { G } from "./styles/theme";
import LoginPage  from "./pages/LoginPage";
import AdminShell from "./AdminShell";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { width: 100%; min-height: 100vh; overflow-x: hidden; }
        body { margin: 0 !important; padding: 0 !important; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${G.cream}; }
        ::-webkit-scrollbar-thumb { background: ${G.pale}; border-radius: 3px; }
      `}</style>

      {loggedIn
        ? <AdminShell onLogout={() => setLoggedIn(false)} />
        : <LoginPage  onLogin={()  => setLoggedIn(true)}  />
      }
    </>
  );
}
