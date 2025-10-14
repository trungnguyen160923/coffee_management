// Table Management Types

export interface Table {
    tableId: number;
    branchId: number;
    branchName?: string;
    label: string;
    capacity: number;
    status: string;
    createAt: string;
    updateAt: string;
    currentReservations?: Reservation[];
}

export interface Reservation {
    reservationId: number;
    customerId?: number;
    customerName?: string;
    phone?: string;
    branchId: number;
    reservedAt: string;
    partySize?: number;
    status: string;
    notes?: string;
    createAt?: string;
    updateAt?: string;
}

export interface TableAssignment {
    reservationId: number;
    customerName?: string;
    phone?: string;
    partySize?: number;
    reservedAt: string;
    status: string;
    assignedTables: Table[];
    message: string;
}

export interface CreateTableRequest {
    branchId: number;
    label: string;
    capacity: number;
}

export interface AssignTableRequest {
    reservationId: number;
    tableIds: number[];
}

export interface UpdateTableStatusRequest {
    tableId: number;
    status: string;
}

export interface UpdateTableRequest {
    tableId: number;
    label: string;
    capacity: number;
    status?: string;
}

export interface TableStatusSummary {
    total: number;
    available: number;
    occupied: number;
    reserved: number;
    maintenance: number;
}
export interface AvailableTableFilters {
    branchId: number;
    partySize: number;
    reservedAt: string;
}

