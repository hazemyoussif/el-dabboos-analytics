/** Ownership token shared by loads, mutations and customer selection. */
export class AdministrationRequestOwnership {
    private revision = 0;
    begin(): number { return ++this.revision; }
    owns(revision: number): boolean { return revision === this.revision; }
    invalidate(): void { this.revision++; }
}
