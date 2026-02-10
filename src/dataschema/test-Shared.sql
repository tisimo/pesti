create table "Account"
(
    "accountId"  uuid                                                         not null
        primary key,
    "cognitoSub" varchar(255)                                                 not null
        unique,
    email        varchar(255)                                                 not null,
    role         varchar(100)                                                 not null,
    status       varchar(50)              default 'active'::character varying not null,
    "createdAt"  timestamp with time zone default CURRENT_TIMESTAMP           not null,
    "updatedAt"  timestamp with time zone default CURRENT_TIMESTAMP           not null
);

alter table "Account"
    owner to testshared;

create index "idx_account_cognitoSub"
    on "Account" ("cognitoSub");


create table "RecoveryCode"
(
    "recoveryCodeId" uuid                                   not null
        primary key,
    "cognitoSub"     varchar(255)                           not null,
    "recoveryCode"   varchar(64)                            not null,
    "createdAt"      timestamp with time zone default now() not null
);

alter table "RecoveryCode"
    owner to testshared;

create unique index "UX_RecoveryCode_recoveryCode"
    on "RecoveryCode" ("recoveryCode");

create index "IX_RecoveryCode_cognitoSub"
    on "RecoveryCode" ("cognitoSub");
