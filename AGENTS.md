# AGENTS.md

## Agent skills

### Issue tracker

Local markdown issue tracker under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical triage roles mapped to standard labels. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout (`CONTEXT.md` + `docs/adr/`). See `docs/agents/domain.md`.

## Multi-agent ownership (Orca)

| Agent / worktree | Vai trò | Được sửa |
|---|---|---|
| Claude — `agent-claude` | Coordinator, kiến trúc, review, merge | `.scratch/**`, `docs/**`, `*.md` gốc, `AGENTS.md` |
| Codex — `agent-codex` | Backend + test | `supabase/**`, `src/modules/**`, `src/actions/**`, `src/lib/**`, `src/middleware.ts`, test của các thư mục này |
| Antigravity — `agent-antigravity` | UX/UI + frontend | `src/app/**`, `src/components/**`, file CSS |

- Contract giữa backend và frontend: `docs/api-contract.md`. Không tự đổi chữ ký; cần đổi thì gửi `question` cho Coordinator.
- Mỗi ticket trong `.scratch/job-portal/issues/` có **Phần A (Codex)** và **Phần B (Antigravity)**. Phần A chờ Phần A của các ticket chặn nó; Phần B chờ Phần A cùng ticket và Phần B của các ticket chặn nó. Chi tiết: `docs/orca-runbook.md`.
- Sửa file ngoài ownership → không sửa, báo Coordinator để route đúng agent.
- `package.json` / `package-lock.json`: chỉ Coordinator thêm dependency.
- Mỗi task làm trên branch `task/<NN>-<a|b>-<slug>`, kết thúc bằng `npm test` và `npm run typecheck` xanh.
