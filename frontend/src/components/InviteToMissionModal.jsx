import React, { useState, useEffect } from "react";
import { Btn } from "./ui";
import { Modal } from "./Modal";
import Icon from "./Icon";
import { api } from "../api/client";
import { toast } from "react-hot-toast";

export function InviteToMissionModal({ validator, onClose }) {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    api.missions({ status: "active" })
      .then(res => {
        setMissions(res.missions);
        if (res.missions.length) setSelectedId(res.missions[0].id);
      })
      .catch(() => toast.error("Failed to load missions"))
      .finally(() => setLoading(false));
  }, []);

  const selected = missions.find(m => m.id === selectedId);

  const handleInvite = async () => {
    if (!selected) return;
    setInviting(true);
    try {
      await api.inviteValidator(selected.id, validator.id);
      toast.success(`Invited ${validator.name} to mission!`);
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to invite validator");
      setInviting(false);
    }
  };

  return (
    <Modal title={`Invite ${validator.name}`} onClose={onClose} width={450} align="top">
      <div className="col gap-3" style={{ padding: "0 20px 20px" }}>
        <p className="muted" style={{ margin: 0 }}>Select an active mission to invite this validator to.</p>

        {loading ? (
          <div className="muted">Loading missions...</div>
        ) : missions.length === 0 ? (
          <div className="muted">You have no active missions.</div>
        ) : (
          <>
            <div className="fld" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 6 }}>Mission</label>
              <select className="fin" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
                {missions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>

            {selected && (
              <div className="row ac gap-2 muted" style={{ fontSize: 13 }}>
                <Icon name="target" size={14} />
                {selected.participants.target} target · ₹{selected.reward.amount} reward
              </div>
            )}

            <div className="row gap-2" style={{ padding: "10px 12px", background: "var(--accent-weak)", borderRadius: "var(--radius-sm)", alignItems: "flex-start" }}>
              <Icon name="alertCircle" size={15} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 13, color: "var(--accent)" }}>{validator.name} will receive an invitation to join this mission.</span>
            </div>

            <div className="row gap-2" style={{ justifyContent: "flex-end", marginTop: 4 }}>
              <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
              <Btn variant="primary" icon="send" disabled={inviting} onClick={handleInvite}>
                {inviting ? "Sending…" : "Send Invite"}
              </Btn>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
