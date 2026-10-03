<?php
// Synthetic fixture, usable only with the disposable frontend verification database.
require getcwd().'/vendor/autoload.php';
$app = require getcwd().'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$databasePath = getenv('ZAVSYNC_E2E_DB') ?: '/tmp/zavsync-stage14-e2e.sqlite';
if (! app()->environment('testing') || config('database.default') !== 'sqlite'
    || config('database.connections.sqlite.database') !== $databasePath
    || ! preg_match('#^/tmp/zavsync-(?:stage14-e2e\.sqlite|attendance-e2e-[A-Za-z0-9._-]+)$#', $databasePath ?: '')) {
    throw new RuntimeException('Final portal fixture requires a disposable E2E SQLite database.');
}
$self = App\Models\User::factory()->create(['name'=>'Final Employee','email'=>'final-employee@example.invalid']);
$peer = App\Models\User::factory()->create(['name'=>'Final Peer','email'=>'final-peer@example.invalid']);
$admin = App\Models\User::factory()->create(['name'=>'Final Administrator','email'=>'final-admin@example.invalid']);
$denied = App\Models\User::factory()->create(['email'=>'final-denied@example.invalid','is_platform_admin'=>true]);
$reader = App\Models\User::factory()->create(['email'=>'final-reader@example.invalid','is_platform_admin'=>true]);
$selfPermissions=['employee.self.view','employee.profile.edit','employee.documents.view','employee.documents.upload','employee.announcements.view','employee.directory.view','employee.teams.view','employee.schedule.view','employee.schedule.swap.request','employee.schedule.swap.respond','employee.assets.view','employee.assets.request','employee.expenses.view','employee.expenses.create','employee.expenses.edit','employee.expenses.submit'];
$adminPermissions=['employee.documents.admin.view','employee.documents.issue','employee.documents.release','announcements.view','announcements.manage','announcements.publish','teams.view','teams.manage','schedules.view','schedules.manage','schedules.swaps.decide','assets.view','assets.decide','expenses.view','expenses.categories.manage','expenses.approve'];
foreach (['A','B','C','D'] as $letter) {
    $company=App\Models\Company::factory()->create(['name'=>'Final Company '.$letter,'timezone'=>'Asia/Karachi']);
    if ($letter === 'D') {
        App\Models\PlatformModule::query()->firstOrCreate(['key'=>'payroll'], ['name'=>'Payroll']);
        App\Models\CompanyEntitlement::factory()->for($company)->create(['module_key'=>'payroll','is_enabled'=>false,'updated_by'=>$admin->id]);
    }
    foreach (['self'=>$self,'peer'=>$peer,'admin'=>$admin,'denied'=>$denied,'reader'=>$reader] as $kind=>$user) {
        $role=App\Models\Role::factory()->for($company)->create(['name'=>'Final '.$kind]);
        foreach (match($kind){'self','peer'=>$selfPermissions,'admin'=>$adminPermissions,'reader'=>['teams.view'],default=>['employee.self.view']} as $permission) {
            $role->permissions()->attach(App\Models\Permission::query()->firstOrCreate(['name'=>$permission]));
        }
        $membership=App\Models\CompanyUser::query()->create(['company_id'=>$company->id,'user_id'=>$user->id,'role_id'=>$role->id,'is_active'=>true]);
        if(in_array($kind,['self','peer'],true)) {
            $employee=App\Models\Employee::factory()->for($company)->create(['created_by'=>$admin->id,'full_name'=>'Final '.$kind.' '.$letter,'status'=>$letter==='B'?'terminated':'active']);
            if($letter!=='C')$membership->forceFill(['employee_id'=>$employee->id])->save();
        }
    }
}
