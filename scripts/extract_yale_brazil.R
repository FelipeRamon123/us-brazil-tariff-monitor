args <- commandArgs(trailingOnly = TRUE)
zip_path <- if (length(args) >= 1) args[[1]] else "data/work/yale-release.zip"
out_path <- if (length(args) >= 2) args[[2]] else "data/raw/yale_brazil_rates.csv.gz"
work_dir <- "data/work/yale-unpacked"
dir.create(work_dir, recursive = TRUE, showWarnings = FALSE)
archive <- unzip(zip_path, list = TRUE)$Name
snapshot_members <- archive[grepl("snapshot_.*\\.rds$", archive)]
series_members <- archive[grepl("rate_timeseries\\.rds$", archive)]
members <- if (length(snapshot_members)) snapshot_members else series_members
if (!length(members)) stop("No Yale snapshot_*.rds or rate_timeseries.rds found in release asset")
unzip(zip_path, files = members, exdir = work_dir, overwrite = TRUE)

read_one <- function(full_path) {
  x <- readRDS(full_path)
  country_col <- if ("country" %in% names(x)) "country" else if ("cty_code" %in% names(x)) "cty_code" else stop("No country column")
  x[as.character(x[[country_col]]) == "3510", , drop = FALSE]
}
files <- file.path(work_dir, members)
if (any(grepl("rate_timeseries\\.rds$", files))) {
  selected <- files[grepl("rate_timeseries\\.rds$", files)][1]
  brazil <- read_one(selected)
} else {
  brazil <- do.call(rbind, lapply(files, read_one))
  if (!"valid_from" %in% names(brazil) || all(is.na(brazil$valid_from))) {
    if (!"effective_date" %in% names(brazil)) stop("Snapshots have no effective_date")
    starts <- sort(unique(as.Date(brazil$effective_date)))
    ends <- c(starts[-1] - 1, as.Date("2099-12-31"))
    map <- setNames(ends, as.character(starts))
    brazil$valid_from <- as.Date(brazil$effective_date)
    brazil$valid_until <- as.Date(map[as.character(brazil$valid_from)], origin = "1970-01-01")
  }
}
dir.create(dirname(out_path), recursive = TRUE, showWarnings = FALSE)
write.csv(brazil, gzfile(out_path), row.names = FALSE, na = "")
message("Wrote ", nrow(brazil), " Brazil tariff rows to ", out_path)

