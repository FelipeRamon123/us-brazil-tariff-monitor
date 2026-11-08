# Review, publication and rollback

## Repository roles

- `official-data-api-toolkit`: reusable source connectors, query examples and access documentation.
- `united-states-census-imports-api-showcase`: broad Census API showcase.
- `us-brazil-tariff-monitor`: focused showcase joining Census imports from Brazil to Yale tariff rates.

## Review flow

1. Create a branch named `review/<change>` from the approved `main` commit.
2. Implement and run data validation, unit tests and visual QA.
3. Push the review branch and open a Pull Request without merging it.
4. Publish the exact reviewed source as the public preview.
5. Record the preview URL, source commit and validation results in the Pull Request.
6. Merge only after explicit approval.

Pull Requests do not download external source archives and do not update tracked data. They validate the audited snapshot already committed to the repository. Scheduled and manually dispatched workflows remain responsible for source refreshes.

## Release

After approval:

1. merge the Pull Request into `main`;
2. the workflow publishes or updates the monthly data release `data-AAAA-MM`, with stable assets `us-brazil-tariff-exposure.csv.gz` and `dataset-manifest.json`;
3. tag application changes separately as `vMAJOR.MINOR.PATCH` when a dashboard version is warranted;
4. enable GitHub Pages only after the repository and interface are approved for public access;
5. record Census cutoff, Yale release and dashboard generation timestamp in the release notes.

## Rollback

The safest rollback is a new commit that reverts the undesired Pull Request, preserving history:

```bash
git revert -m 1 <merge_commit>
git push origin main
```

For the hosted preview, redeploy the last approved saved version. For GitHub Pages, rerun the workflow from the reverted `main`. Do not use `git reset --hard` on the shared repository.
