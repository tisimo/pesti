import expressLoader from "./express";
import dependencyInjectorLoader from "./dependencyInjector";
import { connectWithRetry } from "./postgres";
import { docClient, dynamoClient } from "./dynamo";
import Logger from "./logger";

export default async ({ expressApp }) => {
  await connectWithRetry();
  Logger.info("PostgreSQL OJC connection attempt complete.");

  try {
    docClient;
    dynamoClient;
    Logger.info("Connection to DynamoDB established successfully.");
  } catch (error) {
    Logger.error({ err: error }, "Error when connecting to DynamoDB:");
    throw error;
  }

  dependencyInjectorLoader({
    schemas: [],
    controllers: [
      { name: "permissionController", path: "../controllers/PermissionController" },
      { name: "roleController", path: "../controllers/RoleController" },
      { name: "userController", path: "../controllers/UserController" },
      { name: "ojcOverviewController", path: "../controllers/ojc/OjcOverviewController" },
      { name: "ojcUsersController", path: "../controllers/ojc/OjcUsersController" },
      { name: "ojcOrganizationsController", path: "../controllers/ojc/OjcOrganizationsController" },
      { name: "ojcCampaignsController", path: "../controllers/ojc/OjcCampaignsController" },
      { name: "ojcReportsController", path: "../controllers/ojc/OjcReportsController" },
      { name: "ojcDonationsController", path: "../controllers/ojc/OjcDonationsController" },
      { name: "ojcDepositsController", path: "../controllers/ojc/OjcDepositsController" },
      { name: "ojcTransactionsController", path: "../controllers/ojc/OjcTransactionsController" },
      { name: "ojcAnalyticsController", path: "../controllers/ojc/OjcAnalyticsController" },
      { name: "ojcCategoriesController", path: "../controllers/ojc/OjcCategoriesController" },
      { name: "ojcCampaignRevisionController", path: "../controllers/ojc/OjcCampaignRevisionController" },
      { name: "ojcAdminUsersController", path: "../controllers/ojc/OjcAdminUsersController" },
      { name: "ojcKycController", path: "../controllers/ojc/OjcKycController" },
      { name: "ojcWithdrawalsController", path: "../controllers/ojc/OjcWithdrawalsController" },
      { name: "accountCognitoController", path: "../controllers/AccountCognitoController" },
      { name: "auditLogController", path: "../controllers/AuditLogController" },
      { name: "pageGateController", path: "../controllers/PageGateController" },
      { name: "adminEmailController", path: "../controllers/AdminEmailController" },
    ],
    services: [
      { name: "emailService", path: "../services/EmailService" },
      { name: "supportEmailService", path: "../services/SupportEmailService" },
      { name: "notificationsService", path: "../services/NotificationsService" },
      { name: "adminInboxService", path: "../services/MicrosoftInboxService" },
      { name: "permissionService", path: "../services/PermissionService" },
      { name: "roleService", path: "../services/RoleService" },
      { name: "accountCognitoService", path: "../services/AccountCognitoService" },
      { name: "ojcOverviewService", path: "../services/ojc/OjcOverviewService" },
      { name: "ojcUsersService", path: "../services/ojc/OjcUsersService" },
      { name: "ojcOrganizationsService", path: "../services/ojc/OjcOrganizationsService" },
      { name: "ojcCampaignsService", path: "../services/ojc/OjcCampaignsService" },
      { name: "ojcReportsService", path: "../services/ojc/OjcReportsService" },
      { name: "ojcDonationsService", path: "../services/ojc/OjcDonationsService" },
      { name: "ojcDepositsService", path: "../services/ojc/OjcDepositsService" },
      { name: "ojcTransactionsService", path: "../services/ojc/OjcTransactionsService" },
      { name: "ojcAnalyticsService", path: "../services/ojc/OjcAnalyticsService" },
      { name: "ojcCategoriesService", path: "../services/ojc/OjcCategoriesService" },
      { name: "ojcCampaignRevisionService", path: "../services/ojc/OjcCampaignRevisionService" },
      { name: "ojcAdminUsersService", path: "../services/ojc/OjcAdminUsersService" },
      { name: "ojcKycService", path: "../services/ojc/OjcKycService" },
      { name: "ojcWithdrawalsService", path: "../services/ojc/OjcWithdrawalsService" },
      { name: "userService", path: "../services/UserService" },
      { name: "auditLogService", path: "../services/AuditLogService" },
      { name: "ojcOrganizationKybService", path: "../services/ojc/OjcOrganizationKybService" },
      { name: "pageGateService", path: "../services/PageGateService" },
    ],
    repos: [
      { name: "permissionRepo", path: "../repos/PermissionRepo" },
      { name: "roleRepo", path: "../repos/RoleRepo" },
      { name: "userRepo", path: "../repos/UserRepo" },
      { name: "ojcOverviewRepo", path: "../repos/ojc/OjcOverviewRepo" },
      { name: "ojcUsersRepo", path: "../repos/ojc/OjcUsersRepo" },
      { name: "ojcOrganizationsRepo", path: "../repos/ojc/OjcOrganizationsRepo" },
      { name: "ojcOrganizationKybRepo", path: "../repos/ojc/OjcOrganizationKybRepo" },
      { name: "ojcCampaignsRepo", path: "../repos/ojc/OjcCampaignsRepo" },
      { name: "ojcReportsRepo", path: "../repos/ojc/OjcReportsRepo" },
      { name: "ojcReportNotesRepo", path: "../repos/ojc/OjcReportNotesRepo" },
      { name: "ojcDonationsRepo", path: "../repos/ojc/OjcDonationsRepo" },
      { name: "ojcDepositsRepo", path: "../repos/ojc/OjcDepositsRepo" },
      { name: "ojcTransactionsRepo", path: "../repos/ojc/OjcTransactionsRepo" },
      { name: "ojcAnalyticsRepo", path: "../repos/ojc/OjcAnalyticsRepo" },
      { name: "ojcCategoriesRepo", path: "../repos/ojc/OjcCategoriesRepo" },
      { name: "ojcCampaignRevisionRepo", path: "../repos/ojc/OjcCampaignRevisionRepo" },
      { name: "ojcAdminUsersRepo", path: "../repos/ojc/OjcAdminUsersRepo" },
      { name: "ojcKycRepo", path: "../repos/ojc/OjcKycRepo" },
      { name: "notificationsRepo", path: "../repos/Notifications/NotificationsRepo" },
      { name: "ojcWithdrawalsRepo", path: "../repos/ojc/OjcWithdrawalsRepo" },
      { name: "auditLogRepo", path: "../repos/AuditLogRepo" },
      { name: "pageGateRepo", path: "../repos/PageGateRepo" },
    ],
  });

  expressLoader({ app: expressApp });
  Logger.info("Express Loaded");
};
