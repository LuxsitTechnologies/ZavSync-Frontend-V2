<?php
// Synthetic identity fixtures, executed only by the disposable E2E backend bootstrap.
require getcwd().'/vendor/autoload.php';
$app = require getcwd().'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
if (!app()->environment('testing') || config('database.default') !== 'sqlite' || config('database.connections.sqlite.database') !== (getenv('ZAVSYNC_E2E_DB') ?: '/tmp/zavsync-stage14-e2e.sqlite')) {
    throw new RuntimeException('Identity fixture requires the disposable E2E SQLite database.');
}
$user = App\Models\User::factory()->create(['name' => 'Identity Tester', 'email' => 'identity@example.invalid']);
foreach (['A', 'B', 'C'] as $letter) {
    $company = App\Models\Company::factory()->create(['name' => 'Identity Company '.$letter]);
    $role = App\Models\Role::factory()->for($company)->create(['name' => 'Identity manager']);
    foreach (['employee.self.view', 'employee.links.manage', 'platform.users.view'] as $permission) {
        $role->permissions()->attach(App\Models\Permission::query()->firstOrCreate(['name' => $permission]));
    }
    $member = App\Models\CompanyUser::query()->create(['company_id' => $company->id, 'user_id' => $user->id, 'role_id' => $role->id, 'is_active' => true]);
    $employee = App\Models\Employee::factory()->create(['company_id' => $company->id, 'created_by' => $user->id, 'employee_code' => 'IDENTITY-'.$letter, 'full_name' => 'Identity Employee '.$letter, 'status' => $letter === 'A' ? 'terminated' : ($letter === 'B' ? 'resigned' : 'active')]);
    if ($letter !== 'C') $member->forceFill(['employee_id' => $employee->id])->save();
    App\Models\Employee::factory()->create(['company_id' => $company->id, 'created_by' => $user->id, 'employee_code' => 'SPARE-'.$letter, 'full_name' => 'Identity Spare '.$letter]);
}
$reader = App\Models\User::factory()->create(['name' => 'Identity Reader', 'email' => 'identity-reader@example.invalid']);
$readerRole = App\Models\Role::factory()->for($company)->create(['name' => 'Identity reader']);
$readerRole->permissions()->attach(App\Models\Permission::query()->firstOrCreate(['name' => 'employee.self.view']));
App\Models\CompanyUser::query()->create(['company_id' => $company->id, 'user_id' => $reader->id, 'role_id' => $readerRole->id, 'is_active' => true]);
