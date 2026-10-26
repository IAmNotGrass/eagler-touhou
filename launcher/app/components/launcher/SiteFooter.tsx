/** Masthead credit link; the footer keeps only license, project links and registration. */
export const grass1337CreditHref = 'https://b23.tv/kmhLOQb';
export function SiteFooter({onDonation, donationAvailable = true}: {onDonation: () => void; donationAvailable?: boolean}) {
  return <footer className="site-footer">
    <div className="site-footer-divider" aria-hidden="true"/>
    <div className="site-footer-inner">
      <p>使用 GPL-3.0 license。<a href="https://github.com/YomotsuHisami/eagler-touhou" target="_blank" rel="noopener noreferrer">Github 仓库</a><i aria-hidden="true">/</i><a href="https://qm.qq.com/q/eeUrxIltug" target="_blank" rel="noopener noreferrer">QQ 群</a><i aria-hidden="true">/</i><button className="site-footer-link" id="donationOpen" type="button" hidden={!donationAvailable} onClick={onDonation}>捐赠以支持服务器运行</button></p>
      <p className="site-footer-progress"><a href="https://github.com/Ritosa2333/eagler-touhou/blob/main/docs/TOUHOU_PROGRESS.md" target="_blank" rel="noopener noreferrer">适配进度表</a></p>
      <p className="site-footer-record"><a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">赣ICP备2025074288号-1</a></p>
    </div>
  </footer>;
}
