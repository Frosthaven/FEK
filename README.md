FEKv3
=====

Codebase for the Forum Enhancement Kit. A league of legends website upgrade for the forums, FEK runs as a user script in the browser.

Whats needed for launch?
=====

1. jsonResponderv3 needs to be written for the FEK server. Unlike vBulletin, Boards supports multiple regions. This means that we'll have to query the server with a list of user-region pairs like "users=Frosthaven|NA" instead of how we were doing it "region=NA&users=Frosthaven".

2. whenever the user clicks to "load more" discussions or comments, or when the user clicks a different comment page, the loadMemberData function needs to be called to add any new inline-profile elements it finds to FEK.session.users (and re-apply features to the newly loaded content as needed)

3. version checking needs to be in place to allow one-click-update capabilities. We absolutely MUST have this before launching.

4. avatar support. Other features can be launched as they are developed, but avatar support is going to be a crucial starting point.
