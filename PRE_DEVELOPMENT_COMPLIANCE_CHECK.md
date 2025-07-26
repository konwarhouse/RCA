# PRE-DEVELOPMENT COMPLIANCE CHECK

**MANDATORY**: Run this checklist before ANY code changes.

## Universal Protocol Standard Verification

### ✅ Step 1: Protocol Review
- [ ] Read UNIVERSAL_PROTOCOL_STANDARD.md completely
- [ ] Understand NO HARDCODING policy
- [ ] Verify routing pattern requirements
- [ ] Review state persistence requirements

### ✅ Step 2: Existing Code Audit
```bash
# Check for hardcoding violations
grep -r "Math\.random\|Date\.now" server/ client/ --include="*.ts" --include="*.tsx"
grep -r "substr\|substring" server/ client/ --include="*.ts" --include="*.tsx"
grep -r "/tmp/\|/uploads/" server/ client/ --include="*.ts" --include="*.tsx"
```

### ✅ Step 3: Routing Consistency Check
```bash
# Verify path parameter usage
grep -r "req\.query\." server/ --include="*.ts"  # Should be minimal
grep -r "req\.params\." server/ --include="*.ts" # Should be primary
```

### ✅ Step 4: Database Schema Verification
- [ ] Table names: singular, lowercase, underscores
- [ ] Primary keys named `id`
- [ ] Foreign keys follow `<table>_id` pattern
- [ ] All tables have `created_at`, `updated_at`

### ✅ Step 5: File Header Compliance
- [ ] All routing files have protocol headers
- [ ] Headers reference UNIVERSAL_PROTOCOL_STANDARD.md
- [ ] Date and exceptions documented

## POST-DEVELOPMENT VERIFICATION

### ✅ Step 6: Code Review
- [ ] No new hardcoded values introduced
- [ ] All new IDs use `crypto.randomUUID()`
- [ ] File paths use `os.tmpdir()` and `path.join()`
- [ ] Database operations are schema-driven

### ✅ Step 7: Testing
- [ ] Evidence files persist across workflow stages
- [ ] State maintains incident ID associations
- [ ] No hardcoded values in API responses
- [ ] Error messages are clear and actionable

### ✅ Step 8: Documentation Update
- [ ] replit.md updated with changes
- [ ] Protocol compliance verified
- [ ] Any exceptions properly documented

## FAILURE PROTOCOL

**IF ANY CHECK FAILS**: STOP immediately and fix violations before proceeding.

**NO EXCEPTIONS**: Protocol compliance is mandatory and non-negotiable.

---

**This checklist must be completed for every development session.**