// All flags default closed. A source write requires a separate explicit local approval flag.
function approvedDatabaseTarget(){
 if(process.env.NODE_ENV!=="development")return false;
 try{
  const url=new URL(process.env.DATABASE_URL!);
  if(process.env.ALANA_ISOLATED_PAYMENT_TEST==="enabled")return url.pathname==="/alana_payment_test"&&url.hostname==="127.0.0.1"&&process.env.ALANA_PAYMENT_TEST_DATABASE_URL===url.toString();
  return process.env.ALANA_SOURCE_PAYMENT_APPROVED==="enabled"&&process.env.ALANA_DATABASE_AUTH==="enabled"&&["localhost","127.0.0.1"].includes(url.hostname)&&(url.port||"5432")==="5432"&&url.pathname==="/apsi_db";
 }catch{return false;}
}
export function pricingEnabled(){return process.env.ALANA_OWNER_PRICES==="enabled"&&approvedDatabaseTarget();}
export function cashPaymentPolicy(){return process.env.ALANA_CASH_PAYMENTS==="enabled"&&process.env.ALANA_PAYMENT_FEE_POLICY==="zero"&&approvedDatabaseTarget();}
