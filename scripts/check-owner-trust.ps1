$ErrorActionPreference = 'Stop'
try {
    $root = Join-Path $env:ProgramData 'ALANA\OwnerSetup'
    foreach ($item in @($root, (Join-Path $root 'public.json'))) {
        $entry = Get-Item -LiteralPath $item
        if ($entry.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Unsafe trust path' }
        $acl = Get-Acl -LiteralPath $item
        $privileged = @('S-1-5-18', 'S-1-5-32-544')
        if (-not $acl.AreAccessRulesProtected -or $acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -notin $privileged) { throw 'Unprotected trust' }
        foreach ($rule in $acl.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier])) {
            if ($rule.AccessControlType -eq 'Allow' -and $rule.IdentityReference.Value -notin $privileged) {
                $write = [Security.AccessControl.FileSystemRights]'Write, Delete, ChangePermissions, TakeOwnership, DeleteSubdirectoriesAndFiles'
                if (($rule.FileSystemRights -band $write) -ne 0) { throw 'Writable trust' }
            }
        }
    }
    Write-Output 'TRUST_OK'
} catch { Write-Output 'TRUST_UNAVAILABLE'; exit 1 }
