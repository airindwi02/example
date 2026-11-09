param([string]$Username, [string]$ServerUserSid, [switch]$CheckOnly)
$ErrorActionPreference = 'Stop'
try {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'Administrator authorization required' }
    $uac = Get-ItemProperty -LiteralPath 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System'
    if ($uac.EnableLUA -ne 1 -or $uac.ConsentPromptBehaviorAdmin -eq 0 -or $uac.PromptOnSecureDesktop -ne 1) { throw 'Secure Windows elevation policy required' }
    if ($CheckOnly) { Write-Output 'ADMIN_VERIFIED'; exit 0 }
    if ($Username -notmatch '^[A-Za-z0-9_.-]{3,20}$' -or $ServerUserSid -notmatch '^S-1-5-21-\d+-\d+-\d+-\d+$') { throw 'Explicit recipient and server SID required' }
    Add-Type -AssemblyName System.Windows.Forms
    $answer = [Windows.Forms.MessageBox]::Show("Saya telah memverifikasi identitas penerima '$Username'. Terbitkan satu undangan Owner untuk database project ini? Tidak mengubah akun lama.", 'Otorisasi administrator ALANA', 'YesNo', 'Warning')
    if ($answer -ne 'Yes') { throw 'Cancelled' }
    Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
    $raw = & node scripts/owner-invite-preflight.cjs $Username 2>$null
    if ($LASTEXITCODE -ne 0) { throw 'Database preflight unavailable' }
    $baseline = $raw | ConvertFrom-Json
    if ($baseline.database -notmatch '^[a-f0-9]{64}$' -or $baseline.owners -notmatch '^[a-f0-9]{64}$') { throw 'Invalid preflight' }
    $root = Join-Path $env:ProgramData 'ALANA\OwnerSetup'
    $state = Join-Path $env:ProgramData 'ALANA\OwnerSetupState'
    $admins = [Security.Principal.SecurityIdentifier]::new('S-1-5-32-544')
    $system = [Security.Principal.SecurityIdentifier]::new('S-1-5-18')
    $readers = [Security.Principal.SecurityIdentifier]::new('S-1-5-32-545')
    $serverSid = [Security.Principal.SecurityIdentifier]::new($ServerUserSid)
    $inherit = [Security.AccessControl.InheritanceFlags]'ContainerInherit, ObjectInherit'
    function Protect-Directory($directory, $allowServerWrite) {
        if (Test-Path -LiteralPath $directory) { throw 'Existing setup state requires manual review; no automatic renewal' }
        New-Item -ItemType Directory -Path $directory | Out-Null
        $acl = [Security.AccessControl.DirectorySecurity]::new()
        $acl.SetOwner($admins); $acl.SetAccessRuleProtection($true, $false)
        foreach ($sid in @($admins,$system)) { $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($sid,'FullControl',$inherit,'None','Allow')) }
        if ($allowServerWrite) { $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($serverSid,'Modify',$inherit,'None','Allow')) }
        else { $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($readers,'ReadAndExecute',$inherit,'None','Allow')) }
        Set-Acl -LiteralPath $directory -AclObject $acl
    }
    Protect-Directory $root $false
    Protect-Directory $state $true
    $rsa = [Security.Cryptography.RSACryptoServiceProvider]::new(3072)
    $rsa.PersistKeyInCsp = $false
    function B64Url([byte[]]$bytes) { [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+','-').Replace('/','_') }
    $random = New-Object byte[] 32
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create(); $rng.GetBytes($random); $rng.Dispose()
    $now = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    $payload = @{version=1;jti=([BitConverter]::ToString($random).Replace('-','').ToLower());username=$Username;database=$baseline.database;owners=$baseline.owners;issuedAt=$now;expiresAt=($now+900000)} | ConvertTo-Json -Compress
    $bytes = [Text.Encoding]::UTF8.GetBytes($payload)
    $signature = $rsa.SignData($bytes, 'SHA256')
    $public = $rsa.ExportParameters($false)
    $sha = [Security.Cryptography.SHA256]::Create()
    $manifest = @{publicKey=@{kty='RSA';n=(B64Url $public.Modulus);e=(B64Url $public.Exponent)};database=$baseline.database;payloadDigest=([BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-','').ToLower());stateDirectory=$state} | ConvertTo-Json -Depth 4
    $publicFile = Join-Path $root 'public.json'
    [IO.File]::WriteAllText($publicFile,$manifest,[Text.UTF8Encoding]::new($false))
    $fileAcl = [Security.AccessControl.FileSecurity]::new(); $fileAcl.SetOwner($admins); $fileAcl.SetAccessRuleProtection($true,$false)
    foreach ($sid in @($admins,$system)) { $fileAcl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($sid,'FullControl','Allow')) }
    $fileAcl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($readers,'Read','Allow')); Set-Acl -LiteralPath $publicFile -AclObject $fileAcl
    & powershell.exe -NoProfile -NonInteractive -ExecutionPolicy RemoteSigned -File scripts/check-owner-trust.ps1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Public trust verification failed' }
    $token = (B64Url $bytes) + '.' + (B64Url $signature)
    $rsa.Dispose(); $sha.Dispose()
    # Private signing key is never persisted. Do not write the invitation to the console.
    $form = [Windows.Forms.Form]::new(); $form.Text='Undangan Owner ALANA - sekali pakai, 15 menit'; $form.Width=650; $form.Height=190
    $label=[Windows.Forms.Label]::new();$label.Text="Untuk '$Username'. Salin ke kolom undangan di /register. Jangan kirim melalui chat atau log.";$label.Left=15;$label.Top=15;$label.Width=600;$label.Height=40;$form.Controls.Add($label)
    $box=[Windows.Forms.TextBox]::new();$box.Text=$token;$box.UseSystemPasswordChar=$true;$box.ReadOnly=$true;$box.Left=15;$box.Top=60;$box.Width=600;$form.Controls.Add($box)
    $copy=[Windows.Forms.Button]::new();$copy.Text='Salin undangan';$copy.Left=15;$copy.Top=95;$copy.Width=160;$copy.Add_Click({[Windows.Forms.Clipboard]::SetText($box.Text)});$form.Controls.Add($copy)
    [void]$form.ShowDialog();$box.Clear();$token=$null
    Write-Output 'Invitation issued. Setup cannot be reissued automatically.'
} catch { Write-Error 'Penerbitan ditolak/dihentikan. Tidak ada bypass administrator atau percobaan ulang otomatis.'; exit 1 }
