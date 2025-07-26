# UNIVERSAL PROTOCOL STANDARD - MANDATORY COMPLIANCE

**CRITICAL REQUIREMENT**: This protocol MUST be strictly followed for all current and future development on this application (including by AI agents and human developers).

**If you do not understand or spot ambiguity, STOP and ask for clarification before proceeding.**

## 0. NO HARD CODING UNDER ANY CIRCUMSTANCES

❌ **ABSOLUTELY FORBIDDEN**:
- `Math.random()`, `Date.now()`, hardcoded timestamps
- Static file paths like `/tmp/`, `/uploads/`, hardcoded directories
- Magic numbers, hardcoded IDs, fallback values
- Hardcoded API keys, database connections, configuration values
- Static strings for equipment types, failure modes, categories

✅ **MANDATORY ALTERNATIVES**:
- Use `crypto.randomUUID()` for unique identifiers
- Use `os.tmpdir()` and `path.join()` for dynamic paths
- Use schema-driven configuration from database
- Use environment variables and config files
- Use dynamic imports and parameterized functions

## 1. ROUTING & ID PASSING

**CHOSEN STANDARD**: Path parameters (`/api/incidents/:id/evidence`)

❌ **FORBIDDEN**:
- Mixing path and query parameters
- Hardcoded route fragments or IDs
- Fallback values in routing logic

✅ **MANDATORY**:
- All routes use `/api/incidents/:id/` pattern
- All ID access via `req.params.id`
- Every routing file MUST have protocol header comment

## 2. STATE & DATA FLOW

✅ **MANDATORY**:
- Evidence files MUST remain associated with incident ID across ALL stages
- Database persistence required - never rely on browser state alone
- Backend endpoints MUST match frontend ID protocol
- NO workflow step may drop state or evidence associations

## 3. COMPONENT & UI CONSISTENCY

✅ **MANDATORY**:
- Use DataGrid component from @mui/x-data-grid (version 6+)
- Table columns MUST match backend field names
- Evidence tables MUST include: file_name, file_type, status, date_uploaded, uploaded_by
- All forms use common form component with validation
- Clear, actionable error messages

## 4. DATABASE & API SCHEMA PROTOCOL

✅ **MANDATORY**:
- Table names: singular, lowercase, underscores (e.g., evidence_file)
- Primary key column: `id` (UUID or serial)
- Foreign keys: `<referenced_table>_id`
- All tables: `created_at`, `updated_at` (timestamp with timezone)
- API returns: `{ data: ..., error: null }` or `{ data: null, error: <message> }`

## 5. ERROR HANDLING

✅ **MANDATORY**:
- Clear error messages with resolution steps
- Proper HTTP status codes (400, 404, 422, 500)
- NO silent failures or generic messages

## 6. DOCUMENTATION

✅ **MANDATORY HEADER FOR ALL FILES**:
```typescript
/**
 * UNIVERSAL PROTOCOL STANDARD COMPLIANCE HEADER
 * 
 * ROUTING: Path parameter style (/api/incidents/:id/endpoint)
 * NO HARDCODING: All values dynamic, config-driven, schema-based
 * STATE PERSISTENCE: Data associated with incident ID across all stages
 * PROTOCOL: UNIVERSAL_PROTOCOL_STANDARD.md
 * DATE: [Current Date]
 * EXCEPTIONS: [None or specific exceptions with justification]
 */
```

## 7. GENERAL REQUIREMENTS

✅ **MANDATORY**:
- All code TypeScript-typed with interfaces
- Protocol compliance check before any merge/release
- Ask for clarification on edge cases
- Propose changes for protocol updates

## AUTOMATIC COMPLIANCE ENFORCEMENT

This system includes automatic compliance checking:

### Pre-Development Checklist:
- [ ] Read UNIVERSAL_PROTOCOL_STANDARD.md
- [ ] Check for hardcoding violations
- [ ] Verify routing consistency
- [ ] Ensure state persistence
- [ ] Add protocol headers

### Code Review Checklist:
- [ ] No `Math.random()`, `Date.now()`, hardcoded paths
- [ ] All routes follow path parameter pattern
- [ ] Database schema follows naming conventions
- [ ] All files have protocol headers
- [ ] Error handling is clear and actionable

### Testing Requirements:
- [ ] Evidence files persist across workflow stages
- [ ] No hardcoded values in generated IDs
- [ ] All API endpoints return proper JSON format
- [ ] State maintains incident ID associations

## VIOLATION CONSEQUENCES

**ANY violation of this protocol is considered a CRITICAL ERROR that must be immediately fixed before proceeding with any other work.**

## AUTO-ENFORCEMENT IN replit.md

This protocol is now embedded in the project documentation and will be automatically referenced for all future development decisions.

---

**THIS PROTOCOL IS NON-NEGOTIABLE AND APPLIES TO ALL AI/HUMAN CONTRIBUTORS.**
**VIOLATIONS MUST BE FLAGGED AND DISCUSSED BEFORE PROCEEDING.**