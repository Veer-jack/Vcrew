import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { Avatar } from "../components/ui";
import PhoneSetup from "../components/PhoneSetup";

export default function Settings() {
  const { builder, setBuilder } = useAuth();

  return (
    <div className="page rise">
      <div className="ph">
        <div><span className="eyebrow">Account</span><h1>Settings</h1><p className="lead">Manage your sign-in and security options.</p></div>
      </div>

      <div className="col gap-5" style={{ maxWidth: 640 }}>
        <div className="card" style={{ padding: "var(--pad-card)", display: "flex", alignItems: "center", gap: 16 }}>
          <Avatar name={builder?.name || ""} size={52} color={builder?.color} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{builder?.name}</div>
            <div className="faint" style={{ fontSize: 13 }}>{builder?.email} · {builder?.org}</div>
          </div>
        </div>

        <PhoneSetup client={api} phone={builder?.phone} phoneVerified={builder?.phoneVerified}
          onUpdate={(phone) => setBuilder(b => ({ ...b, phone, phoneVerified: !!phone }))} />
      </div>
    </div>
  );
}
