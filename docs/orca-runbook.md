# Chạy Job Portal trên Orca

Planning (wayfinder → grill-me → spec → tickets) đã xong. Bắt đầu từ thi công.

## 0. Chuẩn bị (terminal `main`)

```bash
git push origin main            # worktree tạo từ origin/main
orca status --json
orca worktree list --json       # cần thấy: main, agent-claude, agent-claude-logic, agent-codex
```

Tạo worktree (nếu chưa có): Create From `origin/main`:
- `agent-claude` — Claude Code (Coordinator)
- `agent-claude-logic` — Claude Code (logic/backend)
- `agent-codex` — Codex (giao diện)

Mỗi worktree cần `.env.local` (copy từ `.env.example`, điền Supabase URL + anon key) rồi `npm install`.

## 1. Kích hoạt điều phối (chỉ gõ ở `agent-claude`)

```text
/implement-spec
Spec: .scratch/job-portal/spec.md. Tickets: .scratch/job-portal/issues/. Contract: docs/api-contract.md. Ownership: AGENTS.md.

Điều phối bằng Orca Multi-Agent:
1. Tạo Orca run với objective "Build VibeCoding Job Portal v1".
2. Mỗi ticket tách 2 Orca task theo mục "Phân công (Orca)":
   - Phần A (logic) → worktree agent-claude-logic, agent Claude Code, dùng /tdd cho logic domain (state machine, search, posting lifecycle), /implement cho migration và actions.
   - Phần B (giao diện) → worktree agent-codex, agent Codex, dùng /implement, chỉ gọi hàm có trong docs/api-contract.md.
3. Thứ tự: Phần A chỉ dispatch khi Phần A của các ticket trong "Blocked by" đã merge. Phần B chỉ dispatch khi Phần A cùng ticket và Phần B của các ticket trong "Blocked by" đã merge. Ticket chỉ resolved khi cả A và B đã merge.
   Được chạy song song: Claude logic làm Phần A ticket kế tiếp trong khi Codex làm Phần B ticket trước; ticket 04 và 05 song song.
4. Mỗi task dùng branch task/<NN>-<a|b>-<slug>, xong phải npm test + npm run typecheck xanh.
5. Theo dõi worker_done / question / escalation. Khi worker_done: review diff theo spec + contract, merge vào main, cập nhật Status của ticket, mở khóa frontier tiếp theo.
6. Worker hỏi đổi contract → sửa docs/api-contract.md trước rồi mới trả lời. Câu hỏi nghiệp vụ ngoài spec → hỏi tôi.
7. Claude Coordinator (agent-claude) không tự implement src/** trừ sửa tích hợp nhỏ; code logic để Claude ở agent-claude-logic làm.
```

## 2. Thứ tự dự kiến

```text
Claude logic: 01A ─ 02A ─ 03A ─ 04A ─ 05A ─ 06A ─ 07A
Codex:              01B ─ 02B ─ 03B ─ 04B ─ 05B ─ 06B ─ 07B
```

Phần B của mỗi ticket chạy song song với Phần A của ticket kế tiếp.

## 3. Sau khi xong toàn bộ

```text
/code-review        # 2 trục: CODING_STANDARDS.md và spec.md
/claude-handoff
```

Kiểm tra tay trên Supabase thật theo checklist từng ticket, rồi `/pr`.
