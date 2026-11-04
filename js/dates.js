// dayjs 封装。核心仍用 core.js 的“天序号 dayNum”（整数运算，翻周/换起始日不会错），
// dayjs 负责格式化、校验和“加 N 天/周”。没加载到 dayjs 时自动退回手写版本。
var HAS_DJ=typeof dayjs==='function';
function djOf(dn){var x=dnDate(dn);return dayjs(new Date(x.y,x.m-1,x.d))}
function dnOfDj(j){return Math.floor(Date.UTC(j.year(),j.month(),j.date())/MS)}
function dfmt(dn,p){if(HAS_DJ)return djOf(dn).format(p||'M/D');var x=dnDate(dn);return (p&&p.indexOf('YYYY')===0?x.y+'/':'')+x.m+'/'+x.d}
function dAdd(dn,n,unit){if(HAS_DJ)return dnOfDj(djOf(dn).add(n,unit||'day'));return dn+(unit==='week'?n*7:n)}
function isoValid(s){var n=dnFromIso(s);if(n===null)return false;return isoOf(n)===String(s)}   // 往返一次相同才算有效（2026-02-30 会被拒绝）
