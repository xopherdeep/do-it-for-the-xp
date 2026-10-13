# Town Hall rehearsal network (TH7)

A throwaway WordPress multisite in Docker that stands in for the live forthexp.com network, so
the Town Hall bridge can be rehearsed without touching the real site.

- Network: `http://localhost:8090` (subdirectory multisite)
- Family site: `http://localhost:8090/doit/` (the stand-in for `https://doit.forthexp.com`)
- Docker project name `townhall-rehearsal`: its containers, network and volumes
  (`townhall-rehearsal_*`) cannot collide with any other stack on the machine. The owner's
  My Compass stack (`u-wordpress`, `u-mysql`, ...) is never used or touched.
- Plugins are bind-mounted **read-only** from `../Xophz-COMPASS/wp-content/plugins/`:
  `xophz-compass` (the parent), `xophz-compass-xp`, `xophz-compass-bulletin-board`,
  `xophz-compass-bugnet`. All four activate cleanly on `/doit/` (no vendor folder is needed).

## Start

```bash
docker compose -f tools/townhall-rehearsal/docker-compose.yml up -d
```

The first start pulls `wordpress:php8.2-apache` and `wordpress:cli-php8.2` and boots MariaDB 11;
on a busy machine give it a few minutes.

## Setup

```bash
tools/townhall-rehearsal/setup.sh
```

It waits for the containers, then installs the network, adds the multisite constants to
`wp-config.php` and the Apache rewrite rules to `.htaccess` (the first rule passes the
`Authorization` header through, which Application Passwords need), sets registration to user
accounts, creates the `/doit/` site, activates the four plugins on it, creates the `patch-notes`
category with one patch note and one news post, and creates the two accounts. It also writes an
mu-plugin that adds `http://localhost:8090/doit` to the `xp_town_hall_site_urls` filter, so the
XP plugin installs its family tables on `/doit/`. `WP_ENVIRONMENT_TYPE` is `local`, which is
what allows Application Passwords over plain http.

It is idempotent: run it again at any time and it changes nothing (each step prints `ok`).
If you delete the credentials file, the next run generates new passwords and re-keys the two
accounts.

## Credentials

`tools/townhall-rehearsal/.rehearsal-credentials` (mode 600, gitignored, never commit it). It is a
shell-sourceable file with these keys:

```
SITE_URL, NETWORK_ADMIN_USER, NETWORK_ADMIN_PASSWORD, FAMPARENT_USER, FAMPARENT_PASSWORD
```

- `rehearsal-admin`: the network (super) admin.
- `famparent`: a network user who is a member of **no** site (not of `/doit/`), as a parent
  linking from the app would be. The app adds them to `/doit/` as a `contributor` when they link.

The passwords come from `openssl rand -base64 18` and are never printed by the script.

## Point the app at it

In development, in the browser console of the running app:

```js
localStorage.setItem("xp:townHallSite", "http://localhost:8090/doit")
```

## Check it

```bash
curl -s http://localhost:8090/doit/wp-json/ \
  | grep -o -E 'application-passwords|\\?/wp\\?/v2\\?/cafeteria_topic"|\\?/wp\\?/v2\\?/compass_bug"|"xp\\?/v1"' | sort -u
```

All four strings must print. WordPress escapes slashes in JSON (`\/wp\/v2\/cafeteria_topic`), so the
pattern allows an optional backslash before each slash; a pattern with bare slashes only finds
`application-passwords`.

## Stop

```bash
docker compose -f tools/townhall-rehearsal/docker-compose.yml stop     # keep the data
docker compose -f tools/townhall-rehearsal/docker-compose.yml start    # bring it back
```

## Destroy

```bash
docker compose -f tools/townhall-rehearsal/docker-compose.yml down -v
```

This removes the containers, the network and both volumes (the database and the WordPress files).
Then `up -d` and `setup.sh` rebuild it from nothing.

## WP-CLI

```bash
docker compose -f tools/townhall-rehearsal/docker-compose.yml run --rm wpcli wp plugin list --url=http://localhost:8090/doit
```

The `wpcli` service sits behind the `tools` profile, so `up -d` does not start it. In a
multisite, always pass `--url=` to choose the site.
