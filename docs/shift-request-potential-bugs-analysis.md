# Shift Request - Potential Bugs Analysis

## Đã phát hiện các lỗi tiềm ẩn

### 1. **Race Condition: Assignment bị CANCELLED giữa lúc validate và save**

**Vấn đề:**
- Trong `createRequest()`, validate assignment status ở line 229
- Nhưng giữa lúc validate và save request, assignment có thể bị CANCELLED bởi request khác
- → Request được tạo cho assignment đã CANCELLED

**Giải pháp:**
- Re-check assignment status ngay trước khi save request
- Hoặc dùng optimistic locking với version field

---

### 2. **Không check PENDING_MANAGER_APPROVAL khi tạo request mới**

**Vấn đề:**
- Line 237: Chỉ check `PENDING` và `PENDING_TARGET_APPROVAL`
- Không check `PENDING_MANAGER_APPROVAL`
- → Có thể tạo request mới trong khi có request khác đang chờ manager approve

**Giải pháp:**
- Thêm `PENDING_MANAGER_APPROVAL` vào check

---

### 3. **Circular Request không được phát hiện**

**Vấn đề:**
- A nhường ca cho B (SWAP)
- B lại yêu cầu lấy ca đó (PICK_UP)
- → Tạo ra circular request, không hợp lý

**Giải pháp:**
- Check circular request khi tạo:
  - SWAP: Check xem B có đang yêu cầu lấy ca này không?
  - PICK_UP: Check xem B có đang nhường ca này cho A không?

---

### 4. **respondToRequest: Không check assignment còn valid**

**Vấn đề:**
- Line 302-320: B respond to request
- Không check xem assignment có còn valid không (có thể đã bị CANCELLED)
- → B có thể đồng ý request cho assignment đã không còn tồn tại

**Giải pháp:**
- Check assignment status trước khi accept
- Nếu assignment đã CANCELLED → Reject với error

---

### 5. **respondToRequest: Không check conflicting requests**

**Vấn đề:**
- B có thể đồng ý request trong khi có request khác đã được approve cho assignment này
- → Tạo ra inconsistency

**Giải pháp:**
- Check xem có request khác đã APPROVED cho assignment này không
- Nếu có → Reject với error

---

### 6. **approveRequest: Không check assignment còn valid**

**Vấn đề:**
- Line 362: Get assignment từ request
- Không check xem assignment có còn valid không (có thể đã bị CANCELLED bởi request khác)
- → Manager có thể approve request cho assignment đã CANCELLED

**Giải pháp:**
- Check assignment status trước khi process
- Nếu đã CANCELLED → Reject với error

---

### 7. **approveRequest: Không cancel conflicting requests**

**Vấn đề:**
- Khi approve request, tạo assignment mới
- Nhưng không cancel các request khác liên quan đến assignment cũ
- → Các request khác vẫn ở trạng thái PENDING nhưng assignment đã CANCELLED

**Giải pháp:**
- Sau khi approve, cancel tất cả requests khác cho assignment cũ
- Cancel requests của target staff cho assignment mới (nếu có)

---

### 8. **approveRequest: Không check target staff đã có assignment**

**Vấn đề:**
- SWAP/PICK_UP: Tạo assignment mới cho target staff
- Không check xem target staff đã có assignment cho ca đó chưa
- → Có thể tạo duplicate assignment

**Giải pháp:**
- Check xem target staff đã có assignment cho shift này chưa
- Nếu có → Reject hoặc cancel assignment cũ

---

### 9. **TWO_WAY_SWAP: Không check targetAssignment còn valid**

**Vấn đề:**
- Line 453: Get targetAssignment từ ID
- Không check xem targetAssignment có còn valid không (có thể đã bị CANCELLED)
- → Có thể swap với assignment đã CANCELLED

**Giải pháp:**
- Check targetAssignment status trước khi process
- Nếu đã CANCELLED → Reject với error

---

### 10. **TWO_WAY_SWAP: Không check targetAssignment có request khác không**

**Vấn đề:**
- targetAssignment có thể có request khác đang pending
- Khi approve TWO_WAY_SWAP, cancel targetAssignment
- → Request khác của targetAssignment trở nên invalid

**Giải pháp:**
- Cancel tất cả requests của targetAssignment trước khi cancel assignment

---

### 11. **Multiple PICK_UP requests: Không handle khi approve**

**Vấn đề:**
- B, C, D cùng yêu cầu lấy ca của A
- Manager approve request của B
- C, D vẫn ở trạng thái PENDING nhưng assignment đã CANCELLED

**Giải pháp:**
- Khi approve một PICK_UP request, cancel tất cả PICK_UP requests khác cho assignment đó

---

### 12. **Race Condition: Hai manager cùng approve requests khác nhau**

**Vấn đề:**
- Manager 1 approve request của B
- Manager 2 approve request của C (cùng lúc)
- → Cả hai đều tạo assignment mới, gây conflict

**Giải pháp:**
- Dùng database lock (SELECT FOR UPDATE) khi approve
- Hoặc check assignment status trước khi tạo assignment mới

---

### 13. **TWO_WAY_SWAP: targetAssignmentId parse từ reason có thể sai**

**Vấn đề:**
- Line 430-438: Parse targetAssignmentId từ reason field
- Nếu reason có chứa "|TARGET_ASSIGNMENT_ID:" trong nội dung → Parse sai
- → Có thể lấy sai targetAssignment

**Giải pháp:**
- Dùng format đặc biệt hơn, hoặc lưu targetAssignmentId vào field riêng
- Hoặc validate targetAssignmentId sau khi parse

---

### 14. **Validation không đồng bộ với assignment status**

**Vấn đề:**
- Validate assignment status ở line 229
- Nhưng giữa lúc validate và save, assignment có thể thay đổi
- → Request được tạo với assignment không còn valid

**Giải pháp:**
- Re-validate assignment status ngay trước khi save
- Hoặc dùng optimistic locking

---

### 15. **Không check nếu target staff đã có assignment cho shift đó**

**Vấn đề:**
- SWAP/PICK_UP: Tạo assignment mới cho target staff
- Không check xem target staff đã có assignment cho shift đó chưa
- → Có thể tạo duplicate assignment

**Giải pháp:**
- Check xem target staff đã có assignment cho shift này chưa
- Nếu có → Reject hoặc cancel assignment cũ

---

### 16. **respondToRequest: Không check nếu target staff đã có assignment mới**

**Vấn đề:**
- B respond to request
- Nhưng giữa lúc tạo request và respond, target staff có thể đã có assignment mới cho ca đó (do request khác được approve)
- → B đồng ý nhưng không thể thực hiện được

**Giải pháp:**
- Check xem target staff đã có assignment cho shift này chưa
- Nếu có → Reject với error

---

### 17. **Không validate assignment status khi get từ request**

**Vấn đề:**
- `request.getAssignment()` có thể trả về assignment đã CANCELLED
- Không check status trước khi dùng

**Giải pháp:**
- Luôn check assignment status trước khi process

---

### 18. **TWO_WAY_SWAP: Fallback logic có thể lấy sai assignment**

**Vấn đề:**
- Line 441-450: Fallback tìm assignment trên cùng ngày
- Nếu target staff có nhiều assignments cùng ngày → Lấy assignment đầu tiên, có thể sai

**Giải pháp:**
- Không dùng fallback, bắt buộc phải có targetAssignmentId
- Hoặc validate targetAssignmentId sau khi parse

---

### 19. **Không check nếu shift đã bị xóa hoặc thay đổi**

**Vấn đề:**
- Assignment có thể trỏ đến shift đã bị xóa hoặc thay đổi
- Không check shift validity

**Giải pháp:**
- Check shift validity trước khi process

---

### 20. **Race Condition: Concurrent requests cho cùng assignment**

**Vấn đề:**
- Hai staff cùng tạo request cho cùng assignment (cùng lúc)
- Cả hai đều pass check "no pending request" (vì chưa có request nào được save)
- → Tạo ra 2 requests cùng lúc

**Giải pháp:**
- Dùng database constraint (unique index) hoặc lock
- Hoặc check lại sau khi save

---

## Tổng kết các lỗi cần fix

### Critical (Phải fix ngay):
1. ✅ Circular request detection
2. ✅ Auto-cancel conflicting requests khi approve
3. ✅ Check assignment status trước khi process
4. ✅ Check PENDING_MANAGER_APPROVAL khi tạo request
5. ✅ Check target staff đã có assignment chưa

### High Priority:
6. ✅ Race condition: Assignment bị CANCELLED giữa validate và save
7. ✅ TWO_WAY_SWAP: Check targetAssignment validity
8. ✅ Multiple PICK_UP requests handling
9. ✅ respondToRequest: Check assignment validity

### Medium Priority:
10. ✅ TWO_WAY_SWAP: Parse targetAssignmentId an toàn hơn
11. ✅ Race condition: Concurrent requests
12. ✅ Validation đồng bộ với assignment status

### Low Priority:
13. ✅ Shift validity check
14. ✅ Fallback logic improvement

