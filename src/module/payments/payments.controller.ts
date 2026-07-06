import { catchAsync } from "../../utils/catchAsync"

const getOwnUserPaymentsHistory = catchAsync( async() => {
    // only user can see payment history
})
const getSinglePaymentsByID = catchAsync( async() => {
    // only own payment or own provider payment
})
const confirmPayment = catchAsync( async() => {
    
})
const createPayments = catchAsync( async() => {
    
})
const updatePayments = catchAsync( async() => {
    
})
const deletePayments = catchAsync( async() => {
    
})


export const PaymentsController = {
    getOwnUserPaymentsHistory,
    getSinglePaymentsByID,
    confirmPayment,
    createPayments,
    updatePayments,
    deletePayments
}