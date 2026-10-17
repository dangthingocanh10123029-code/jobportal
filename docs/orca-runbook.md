# Chạy Job Portal trên Orca

Planning (wayfinder → grill-me → spec → tickets) đã xong. Bắt đầu từ thi công.

## 0. Chuẩn bị (terminal `main`)

```bash
git push origin main            # worktree tạo từ origin/main
orca status --json
orca worktree list --json       # cần thấy: main, agent-claude, agent-claude-logic, agent-codex, agent-antigravity
```

Tạo worktree (nếu chưa có): Create From `origin/main`:
- `agent-claude` — Claude Code (Coordinator)
- `agent-claude-logic` — Claude Code (logic/backend)
- `agent-codex` — Codex (giao diện)
- `agent-antigravity` — Antigravity (hình ảnh)

Mỗi worktree cần `.env.local` (copy từ `.env.example`, điền Supabase URL + anon key) rồi `npm install`.

## 1. Kích hoạt điều phối (chỉ gõ ở `agent-claude`)

```text
/implement-spec
Bạn là Claude Coordinator của dự án jobportal.
Đọc: AGENTS.md, .scratch/job-portal/spec.md, .scratch/job-portal/issues/, docs/api-contract.md, docs/orca-runbook.md.

Điều phối bằng Orca Multi-Agent (dùng orca orchestration thật, không chỉ gửi prompt thủ công):

1. Chạy `orca status --json` và `orca worktree list --json`, lấy đúng ID của 4 worktree:
   agent-claude (bạn), agent-claude-logic, agent-codex, agent-antigravity. Dùng worktree có sẵn, không tạo worktree mới.
2. Tạo Orca run với objective "Build Job Portal v1".
3. Tạo Orca task theo mục "Phân công (Orca)" của từng ticket:
   - Phần A (logic) → agent-claude-logic (Claude Code): /tdd cho logic domain, /implement cho migration và actions.
   - Phần B (giao diện) → agent-codex (Codex): /implement, chỉ gọi hàm trong docs/api-contract.md, dùng ảnh theo mục Hình ảnh.
   - Ticket 08 (hình ảnh) → agent-antigravity (Antigravity): làm trọn ticket.
4. Thứ tự dispatch:
   - Wave đầu, dispatch cùng lúc: 01A → agent-claude-logic và 08 → agent-antigravity.
   - Phần A chỉ dispatch khi Phần A của các ticket trong "Blocked by" đã merge.
   - Phần B chỉ dispatch khi Phần A cùng ticket và Phần B của các ticket trong "Blocked by" đã merge.
   - Ngay khi một agent rảnh và có task đủ điều kiện → dispatch luôn, để Claude logic làm A ticket sau trong lúc Codex làm B ticket trước.
   - Mỗi worktree chỉ chạy 1 task một lúc. Ticket resolved khi cả A và B đã merge.
5. Mỗi task: worker tạo branch task/<NN>-<a|b>-<slug> từ main mới nhất, chỉ sửa file trong ownership của mình (AGENTS.md), kết thúc bằng npm test + npm run typecheck xanh (ticket 08: npm run build), commit rồi báo worker_done kèm tóm tắt diff.
6. Vòng lặp: `orca orchestration check --wait --types "worker_done,escalation,question"`.
   - worker_done → review diff theo spec + contract + CODING_STANDARDS.md; đạt thì merge branch vào main (trong worktree main, --no-ff), cập nhật Status của ticket, dispatch task tiếp theo; chưa đạt thì gửi lại cho đúng worker kèm nhận xét cụ thể.
   - question về contract → sửa docs/api-contract.md trước, commit vào main, rồi mới trả lời.
   - question về nghiệp vụ ngoài spec hoặc escalation không tự giải được → hỏi tôi.
7. Bạn không tự code src/** trừ sửa tích hợp nhỏ khi merge. Không git push.
8. Trước khi dispatch, in ra: ID 4 worktree, danh sách task đã tạo, wave đầu. Sau đó DỪNG chờ tôi gõ "Approve".
   Sau khi approve, chạy liên tục đến khi xong cả 8 ticket, rồi báo tổng kết và đề xuất chạy /code-review.
```

## 2. Thứ tự dự kiến

```text
Claude logic: 01A ─ 02A ─ 03A ─ 04A ─ 05A ─ 06A ─ 07A
Codex:              01B ─ 02B ─ 03B ─ 04B ─ 05B ─ 06B ─ 07B
Antigravity:  08 (chạy ngay, song song với tất cả)
```

Phần B của mỗi ticket chạy song song với Phần A của ticket kế tiếp.

## 3. Sau khi xong toàn bộ

```text
/code-review        # 2 trục: CODING_STANDARDS.md và spec.md
/claude-handoff
```

Kiểm tra tay trên Supabase thật theo checklist từng ticket, rồi `/pr`.
