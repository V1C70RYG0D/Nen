import dns from 'dns';

export class NetworkUtils {
  static resolveDns(hostname: string): Promise<string> {
    return new Promise((resolve, reject) => {
      dns.lookup(hostname, (err, address) => {
        if (err) reject(err);
        resolve(address);
      });
    });
  }

  static isValidIp(ip: string): boolean {
    const ipRegex = /^(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])(\.(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])){3}$/;
    return ipRegex.test(ip);
  }
}

export default NetworkUtils;
