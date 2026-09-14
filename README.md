Master Group v214 — persistent directions/catalog fix.

Fixed direction persistence: new directions, renamed directions, services and deletions are marked dirty and uploaded to Firebase, confirmed by read-back, and the cloud catalog is restored on refresh/device login when there are no pending local changes. Local changes remain queued until the cloud write succeeds.

v215 — fixed Firebase account login modal: it no longer closes/reopens during auth state transitions; login/signup keeps the modal visible until authentication and initial cloud sync succeed.
