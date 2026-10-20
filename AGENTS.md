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
| Claude — `agent-claude` | Coordinator, kiến trúc, review, merge (không tự code `src/**`) | `.scratch/**`, `docs/**`, `*.md` gốc, `AGENTS.md` |
| Claude — `agent-claude-logic` | Logic + backend + test | `supabase/**`, `backend/**` (trừ module giao cho Codex), `src/modules/**`, `src/actions/**`, `src/lib/**`, `src/proxy.ts` (Next 16, trước là middleware.ts), test của các thư mục này |
| Codex — `agent-codex` | Giao diện (UX/UI + frontend) + module backend được giao | `src/app/**`, `src/components/**`, file CSS (trừ file ảnh của Antigravity); `backend/app/modules/{companies,candidates,notifications,dashboard}/**` + test tương ứng (ticket 25, 26) |
| Antigravity — `agent-antigravity` | Hình ảnh | `public/images/**`, `src/app/icon.png`, `src/app/opengraph-image.png` |

- Contract giữa backend và frontend, danh sách hình ảnh và bảng màu: `docs/api-contract.md`. Không tự đổi chữ ký; cần đổi thì gửi `question` cho Coordinator.
- Mỗi ticket trong `.scratch/job-portal/issues/` có **Phần A (Claude — logic)** và **Phần B (Codex — giao diện)**. Phần A chờ Phần A của các ticket chặn nó; Phần B chờ Phần A cùng ticket và Phần B của các ticket chặn nó. Chi tiết: `docs/orca-runbook.md`.
- Sửa file ngoài ownership → không sửa, báo Coordinator để route đúng agent.
- `package.json` / `package-lock.json` / `backend/pyproject.toml` / `backend/uv.lock`: chỉ Coordinator thêm dependency.
- Backend FastAPI: xem `docs/adr/0003-fastapi-backend.md`. Kiểm tra backend: `cd backend && uv run pytest && uv run ruff check`.
- Mỗi task làm trên branch `task/<NN>-<a|b>-<slug>`, kết thúc bằng `npm test` và `npm run typecheck` xanh.
