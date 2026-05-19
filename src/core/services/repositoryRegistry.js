import { LocalDatabase } from '../repositories/local/localDatabase'
import {
  LocalAssetCatalogRepository,
  LocalAuditLogRepository,
  LocalAttendanceRepository,
  LocalBankStatementRepository,
  LocalCategoryRepository,
  LocalClassReportRepository,
  LocalContractRepository,
  LocalEmployeeRepository,
  LocalEventOrderRepository,
  LocalEventRepository,
  LocalFamilyRepository,
  LocalMealContractRepository,
  LocalLibraryBookRepository,
  LocalPedagogicalPlanRepository,
  LocalFinancialRecordRepository,
  LocalRecurringTemplateRepository,
  LocalResponsibleRepository,
  LocalStudentRepository,
  LocalStudentTagRepository,
} from '../repositories/local/localRepositories'
import {
  SupabaseFamilyRepository,
  SupabaseResponsibleRepository,
  SupabaseStudentRepository,
} from '../repositories/supabase/supabaseRepositories'
import { hasSupabaseConfig, supabase } from '../../lib/supabaseClient'
import { ContractService } from './contractService'
import { EventService } from './eventService'
import { FinancialService } from './financialService'
import { ReconciliationService } from './reconciliationService'
import { RecurringTransactionService } from './recurringTransactionService'
import { KitchenService } from './kitchenService'
import { CheckoutMonitorService } from './checkoutMonitorService'
import { SchoolCrudService } from './schoolCrudService'
import { SpreadsheetExportService } from './spreadsheetExportService'

const database = new LocalDatabase()
const useSupabaseRepositories = Boolean(hasSupabaseConfig && supabase)

const emptyRepository = {
  async list() {
    return []
  },
  async getById() {
    return null
  },
  async create(payload = {}) {
    return { id: null, ...payload }
  },
  async update() {
    return null
  },
  async delete() {
    return true
  },
  async upsertBatch() {
    return true
  },
  async listRegistry() {
    return []
  },
  async upsertRegistry() {
    return null
  },
}

const familyRepository = new LocalFamilyRepository(database)
const responsibleRepository = new LocalResponsibleRepository(database)
const studentRepository = new LocalStudentRepository(database)
const mealContractRepository = new LocalMealContractRepository(database)
const eventRepository = new LocalEventRepository(database)
const eventOrderRepository = new LocalEventOrderRepository(database)
const studentTagRepository = useSupabaseRepositories
  ? emptyRepository
  : new LocalStudentTagRepository(database)
const employeeRepository = new LocalEmployeeRepository(database)
const classReportRepository = new LocalClassReportRepository(database)
const pedagogicalPlanRepository = new LocalPedagogicalPlanRepository(database)
const attendanceRepository = new LocalAttendanceRepository(database)
const financialRecordRepository = new LocalFinancialRecordRepository(database)
const auditLogRepository = new LocalAuditLogRepository(database)
const assetCatalogRepository = new LocalAssetCatalogRepository(database)
const libraryBookRepository = new LocalLibraryBookRepository(database)
const categoryRepository = new LocalCategoryRepository(database)
const contractRepository = new LocalContractRepository(database)
const bankStatementRepository = new LocalBankStatementRepository(database)
const recurringTemplateRepository = new LocalRecurringTemplateRepository(database)

export const schoolCrudService = new SchoolCrudService({
  familyRepository,
  responsibleRepository,
  studentRepository,
  studentTagRepository,
  employeeRepository,
})
schoolCrudService.setOperationsRepositories({
  mealContractRepository,
  eventOrderRepository,
  eventRepository,
})
schoolCrudService.setPedagogicalRepositories({
  classReportRepository,
  pedagogicalPlanRepository,
  attendanceRepository,
})
schoolCrudService.setBusinessRepositories({
  financialRecordRepository,
  auditLogRepository,
  assetCatalogRepository,
  libraryBookRepository,
  categoryRepository,
})

export const financialService = new FinancialService({ financialRecordRepository, auditLogRepository })
financialService.setDatabaseRef(database)

export const contractService = new ContractService({ contractRepository, financialRecordRepository, auditLogRepository })
export const reconciliationService = new ReconciliationService({ bankStatementRepository, financialRecordRepository, financialService })
export const recurringTransactionService = new RecurringTransactionService({ recurringTemplateRepository, financialRecordRepository })

export const spreadsheetExportService = new SpreadsheetExportService(schoolCrudService)
export const kitchenService = new KitchenService({ schoolCrudService })
export const eventService = new EventService({ schoolCrudService })
export const checkoutMonitorService = new CheckoutMonitorService({
  database,
  schoolCrudService,
  supabase,
  hasSupabaseConfig,
})

export {
  database,
  eventOrderRepository,
  eventRepository,
  familyRepository,
  mealContractRepository,
  responsibleRepository,
  studentRepository,
  studentTagRepository,
  employeeRepository,
}
