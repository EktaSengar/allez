# Allez account setup and first invitations

Prepared 2 October 2026. Enrollment has not been submitted, Cloudflare has
not been configured, and no invitations have been sent.

## Apple Developer

**Decision, 2 October 2026: build and test locally first. Paid enrollment and
publishing are deferred.** Use the iOS Simulator and, for a local build on
your own device, sign into Xcode with a free Apple Account (Personal Team).
Free device provisioning profiles expire after seven days; rebuild and
reinstall when needed. Some advanced capabilities require paid membership.

Enroll when the app is ready for TestFlight or App Store distribution, or
when a feature under test requires membership. At that point, start at
https://developer.apple.com/programs/enroll/ with two-factor authentication
enabled on the Apple Account.

If Allez is not incorporated and you are publishing as an individual or sole
proprietor, enroll as an individual. Your legal name appears as the App Store
seller. An organization account requires an incorporated legal entity and,
except for government entities, a D-U-N-S number. Membership is US$99 per
year, with regional pricing where applicable.

The account holder needs to provide their legal identity and contact details,
review the agreements, and complete the membership purchase. Completion means
Apple shows the enrollment submission or membership confirmation.

Source: https://developer.apple.com/programs/enroll/
Local testing: https://developer.apple.com/help/account/basics/about-your-developer-account
Distribution: https://developer.apple.com/help/account/membership/programs-overview/

## Cloudflare and hello@allez.city

The domain currently uses Porkbun nameservers. Public DNS queried on
2 October 2026 shows these website records:

| Type | Name | Value | TTL (seconds) |
| --- | --- | --- | --- |
| A | allez.city | 185.199.108.153 | 600 |
| A | allez.city | 185.199.109.153 | 600 |
| A | allez.city | 185.199.110.153 | 600 |
| A | allez.city | 185.199.111.153 | 600 |
| CNAME | www.allez.city | ektasengar.github.io | 600 |

No answers were returned for apex MX, TXT, AAAA, or DS queries. These queries
are a public snapshot, not a complete export of the Porkbun DNS zone.

1. Create or sign into Cloudflare at https://dash.cloudflare.com/.
2. Add `allez.city` on the Free plan. Review all records against Porkbun's DNS
   dashboard, including subdomains and verification records. Preserve the
   website values above; initially use DNS-only for those website records.
3. Copy the two nameservers Cloudflare assigns to this zone. Set those exact
   nameservers in Porkbun. The domain registration can stay at Porkbun.
4. Verify Cloudflare marks the zone active and the existing website still
   works over HTTPS, including the Bay Area page.
5. In Cloudflare Email Routing, onboard the domain and review its proposed
   mail records against any existing email service before applying them.
6. Add the founder's chosen destination inbox and verify it using Cloudflare's
   verification email. Create `hello@allez.city` with action “Send to an email”
   and that verified inbox as the destination.
7. Send a test from a different email account and confirm it reaches the
   destination inbox, checking spam if necessary.

Forwarding incoming mail does not configure an inbox or a send-as identity
for replies. The first invitations can be sent from the founder's existing
email account or WhatsApp.

Sources:
- https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/
- https://developers.cloudflare.com/email-service/get-started/route-emails/

## Locals' Bench invitation draft

The launch plan uses this name for friends whose taste the founder trusts.
They contribute a photo and a line after visiting somewhere; the founder
selects and approves entries, credited by first name. The first ten people
have not been chosen, and no contact list was found in the launch plan.

Subject, if emailing: A small ask for Allez

Hey [Name]! I'm building Allez (https://allez.city), a guide to places worth
leaving home for. I'd love your help because I trust your taste. When you go
somewhere you'd recommend, could you send me one photo you took and one honest
line about what made it worth the trip? WhatsApp or email is fine—no account
or regular commitment. If I include it, I'd credit you by first name. Would
you be up for it?

Before sending: choose the ten recipients and their email addresses or
WhatsApp contacts. Send individually and record confirmed sends; do not mark
the launch task complete until all ten have been sent.
