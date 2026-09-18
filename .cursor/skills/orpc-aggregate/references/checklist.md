# oRPC aggregate checklist

- [ ] Contract schema + types in same `*.schema.ts` module
- [ ] Contract procedures in CRUD order with section banners
- [ ] Domain router composed; root `contract` updated if needed
- [ ] Service CRUD order matches contract
- [ ] Controller `@Implement` only; same method order
- [ ] Household scope for money/product household rows
- [ ] Explicit DTO mapping matches contract output
- [ ] Module registers entities/services like neighbors
- [ ] No Express / local wire DTO / schema-tenant leftovers
- [ ] Frontend uses typed client when UI ships in same change
