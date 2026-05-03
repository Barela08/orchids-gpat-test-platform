# Subject/Chapter Feature Implementation TODO

## Steps:
- [x] 1. Create this TODO.md file
- [x] 2. Update src/lib/models/Question.ts - Add `chapter: string` field
- [x] 3. Update src/lib/models/TestResult.ts - Add `subject`, `chapter` fields  
- [x] 4. Create src/app/api/questions/subjects/route.ts - List subjects with counts
- [x] 5. Create src/app/api/questions/[subject]/chapters/route.ts - Chapters per subject
- [x] 6. Update src/app/api/questions/route.ts - Add filtering by subject/chapter/year
- [x] 7. Update src/app/api/test/results/route.ts and submit/route.ts - Handle subject/chapter
- [x] 8. Update src/app/admin/page.tsx - Add Subjects/Chapters tabs, filters, upload inputs
- [x] 9. Update src/app/dashboard/page.tsx - Nested Year > Subject > Chapter UI
- [x] 10. Update src/app/test/page.tsx - Filter questions by params, pass to test APIs
- [x] 11. Test upload parser for chapter detection
- [ ] 12. Full testing: Upload with subject/chapter, filtering, tests
- [ ] 13. Update README.md if needed
- [ ] 14. Complete task
