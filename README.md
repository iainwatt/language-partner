# Language Partner

One repository for the mobile app and product website.

```text
language-partner/
├── .env          # Existing local configuration (ignored by Git)
├── mobile/       # Expo app, native project, Firebase backend and app docs
│   └── .env      # Local symlink to ../.env
└── frontend/     # Landing-page workspace
```

## Mobile app

Run the existing app commands from `mobile`:

```sh
cd mobile
npm start
```

From the repository root, run checks with `npm --prefix mobile run check`.
See [mobile setup and development](mobile/README.md) for native builds and Firebase.

The original `.env` stays at this repository root. `mobile/.env` is an ignored
symlink so Expo and native builds load the same configuration. On a fresh clone,
create the root `.env` from `mobile/.env.example`, fill in its settings, then run
`ln -s ../.env mobile/.env` from the repository root.

## Frontend

The [frontend directory](frontend/) is ready for the product landing page.
