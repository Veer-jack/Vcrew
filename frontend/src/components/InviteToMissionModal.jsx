import React, { useState, useEffect } from "react";
import { Btn } from "./ui";
import { Modal } from "./Modal";
import { api } from "../api/client";
import { toast } from "react-hot-toast";

export function InviteToMissionModal({ validator, onClose }) {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(null);

  useEffect(() => {
    api.missions({ status: "active" })
      .then(res => setMissions(res.missions))
      .catch(() => toast.error("Failed to load missions"))
      .finally(() => setLoading(false));
  }, []);

  const handleInvite = async (missionId) => {
    setInviting(missionId);
    try {
      await api.inviteValidator(missionId, validator.id);
      toast.success(`Invited ${validator.name} to mission!`);
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to invite validator");
      setInviting(null);
    }
  };

  return (
    <Modal title={`Invite ${validator.name}`} onClose={onClose} width={450}>
      <div className="col gap-3" style={{ padding: "0 20px 20px" }}>
        <p className="muted" style={{ margin: 0 }}>Select an active mission to invite this validator to.</p>
        
        {loading ? (
          <div className="muted">Loading missions...</div>
        ) : missions.length === 0 ? (
          <div className="muted">You have no active missions.</div>
        ) : (
          <div className="col gap-2">
            {missions.map(m => (
              <div key={m.id} className="row jsb ac" style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 8 }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{m.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{m.participants.target} target · ₹{m.reward.amount}</div>
                </div>
                <Btn 
                  variant="primary" 
                  size="sm"
                  loading={inviting === m.id}
                  disabled={inviting != null}
                  onClick={() => handleInvite(m.id)}
                >
                  Invite
                </Btn>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
